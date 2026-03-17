"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import { Sandpack } from "@codesandbox/sandpack-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  
  const [response, setResponse] = useState<any>({
    current_phase: "",
    data: { generated_code: {} },
    run_id: null
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [response.current_phase, agentLogs]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/history");
      if (res.ok) setHistory(await res.json());
    } catch (err) { 
      console.error("History fetch error:", err);
    }
  };

  const runAgency = async () => {
    if (!prompt) return;
    setLoading(true);
    setAgentLogs(["🚀 Deploying Agents...", "> Connecting to LangGraph Orchestrator..."]); 
    
    if (!response.data?.generated_code || Object.keys(response.data.generated_code).length === 0) {
      setResponse({ current_phase: "Initializing...", data: { generated_code: {} }, run_id: null });
    } else {
      setResponse((prev: any) => ({ ...prev, current_phase: "Updating code..." }));
    }

    try {
      const res = await fetch("http://localhost:8000/api/v1/run-agency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          task_description: prompt, 
          thread_id: "auto-01",
          previous_code: response.data?.generated_code || null 
        }),
      });

      if (!res.ok) {
        setAgentLogs(prev => [...prev, "❌ Connection Error! Ensure Backend is running."]);
        setLoading(false);
        return;
      }

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      // Stream Buffer logic for safe JSON parsing
      let buffer = ""; 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const streamData = JSON.parse(part.replace("data: ", ""));
              
              if (streamData.current_phase) {
                setAgentLogs(prev => 
                  prev[prev.length - 1] !== `> ${streamData.current_phase}` 
                    ? [...prev, `> ${streamData.current_phase}`] 
                    : prev
                );
              }

              if (streamData.generated_code) {
                let newCodeObj = streamData.generated_code;
                
                setResponse((prev: any) => ({
                  ...prev,
                  current_phase: streamData.current_phase || prev.current_phase,
                  run_id: streamData.run_id || prev.run_id,
                  data: { generated_code: newCodeObj }
                }));
              }
              
              if (streamData.status === "completed") {
                setResponse((prev: any) => ({ ...prev, run_id: streamData.run_id }));
              }

            } catch (e) {
              // Ignore partial chunks
            }
          }
        }
      }
    } catch (err: any) { 
      setAgentLogs(prev => [...prev, `❌ Error: ${err.message}`]); 
    } finally {
      setLoading(false);
      setAgentLogs(prev => [...prev, "✅ Task Completed! Ready for preview."]);
      fetchHistory();
      setPrompt(""); 
    }
  };

  const loadHistoryItem = (item: any) => {
    setPrompt("");
    setAgentLogs([`> Loaded project from history: ID ${item.id}`]);
    try {
      const parsedCode = typeof item.generated_code === 'string' ? JSON.parse(item.generated_code) : item.generated_code;
      setResponse({ current_phase: "History Loaded", run_id: item.id, data: { generated_code: parsedCode } });
    } catch (e) {}
  };

  const startNewProject = () => {
    setPrompt("");
    setAgentLogs([]);
    setResponse({ current_phase: "", data: { generated_code: {} }, run_id: null });
  };

  // 🌟 INFINITE LOOP FIX: Bundle setup and options cleanly inside useMemo 🌟
  const { sandpackFiles, sandpackSetup, sandpackOptions } = useMemo(() => {
    const files: Record<string, string> = {};
    let deps: Record<string, string> = {};

    const genCode = response.data?.generated_code || {};
    let hasAppJs = false;
    let usesRouter = false; 

    Object.entries(genCode).forEach(([filename, code]: any) => {
      let safePath = filename.startsWith('/') ? filename : `/${filename}`;
      const stringCode = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

      if (stringCode.includes('react-router')) usesRouter = true;

      if (safePath.includes('package.json')) {
        try {
          const parsedPkg = JSON.parse(stringCode);
          if (parsedPkg.dependencies) deps = { ...deps, ...parsedPkg.dependencies };
        } catch (e) {}
      } 
      else if (safePath.includes('page.tsx') || safePath.includes('page.jsx') || safePath.includes('App.js') || safePath.includes('App.tsx')) {
        files['/App.js'] = stringCode; 
        hasAppJs = true;
      } 
      else if (!safePath.endsWith('.py')) {
        files[safePath] = stringCode;
      }
    });

    if (!hasAppJs && Object.keys(files).length > 0) {
       files['/App.js'] = `export default function App() { return <div style={{padding: '40px', color: 'black', fontFamily: 'sans-serif'}}><h1>⚙️ Generating UI...</h1><p>Waiting for Frontend Agent to complete code.</p></div> }`;
    }

    if (!files['/styles.css']) {
        files['/styles.css'] = `body { font-family: sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; background: #f9fafb; color: #111827; }`;
    }

    if (usesRouter) {
      deps['react-router-dom'] = "latest"; 
      files['/index.js'] = `
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);`;
    } else {
      files['/index.js'] = `
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`;
    }

    deps['lucide-react'] = "latest";

    // Stable references for Sandpack so React doesn't crash!
    return { 
      sandpackFiles: files, 
      sandpackSetup: { dependencies: deps },
      sandpackOptions: {
        showNavigator: true, 
        showTabs: true,
        editorHeight: 700, 
        editorWidthPercentage: 0 
      }
    };
  }, [response.data?.generated_code]);

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0`}>
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-blue-400">Project History</h2>
          <button onClick={startNewProject} className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded">+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? <p className="text-xs text-gray-500 text-center mt-5">No history yet</p> : null}
          {history.map((item) => (
            <div key={item.id} onClick={() => loadHistoryItem(item)} className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-lg cursor-pointer">
              <p className="text-xs text-gray-300 truncate">{item.prompt}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative h-full bg-gray-950 min-w-0">
        
        <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-800/50 bg-gray-950/80">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400">☰</button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">AutoDev Studio Live</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 pb-56 space-y-6">
          
          {(loading || agentLogs.length > 0) && (
            <div className="max-w-7xl mx-auto bg-black rounded-lg p-4 border border-gray-800 font-mono text-xs text-green-400 shadow-inner">
              <div className="flex gap-2 mb-2 border-b border-gray-800 pb-2 text-gray-500 uppercase"><span>Terminal Log</span></div>
              <div className="space-y-1">
                {agentLogs.map((log, i) => (
                  <div key={i} className={`opacity-80 ${log.includes('❌') ? 'text-red-500' : ''}`}>{log}</div>
                ))}
              </div>
              {loading && <div className="animate-pulse mt-2 text-blue-400">_</div>}
            </div>
          )}

          {response.data?.generated_code && Object.keys(response.data.generated_code).length > 0 && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-in fade-in duration-700">
              
              {/* CODE DISPLAY */}
              <div className="space-y-4">
                {Object.entries(response.data.generated_code).map(([file, code]: any) => {
                  const displayCode = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
                  return (
                    <div key={file} className="rounded-xl overflow-hidden border border-gray-800 shadow-xl bg-gray-950">
                      <div className="bg-gray-800/70 px-4 py-2 flex justify-between items-center text-xs font-mono">
                        <span className="text-blue-300">{file}</span>
                        <div className="flex gap-2">
                          <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] uppercase">{file.split('.').pop()}</span>
                          <button onClick={() => navigator.clipboard.writeText(displayCode)} className="text-[10px] text-gray-400 hover:text-white uppercase">Copy</button>
                        </div>
                      </div>
                      <SyntaxHighlighter language={file.endsWith('.json') ? 'json' : file.endsWith('.py') ? 'python' : 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8rem', maxHeight: '500px' }}>
                        {displayCode}
                      </SyntaxHighlighter>
                    </div>
                  );
                })}
              </div>

              {/* SANDBOX PREVIEW */}
              <div className="sticky top-6 h-[700px] rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-white">
                <Sandpack 
                  template="react" 
                  theme="auto" 
                  files={sandpackFiles}
                  customSetup={sandpackSetup} 
                  options={sandpackOptions} 
                />
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* BOTTOM CHAT */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-gray-400 font-mono flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : (response.current_phase ? 'bg-green-500' : 'bg-gray-600')}`}></div>
                {response.current_phase || "Ready for instructions"}
              </span>
              {response.run_id && (
                <a href={`http://localhost:8000/api/v1/download/${response.run_id}`} download className="text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 px-4 py-1.5 rounded-full flex gap-2 transition-all">
                  📦 Download Full ZIP
                </a>
              )}
            </div>
            <div className="flex gap-2 bg-gray-900/90 backdrop-blur-md p-2 rounded-2xl border border-gray-700 shadow-2xl focus-within:border-blue-500 transition-colors">
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="What do you want to build? (e.g. Build a simple Todo List app)" 
                className="flex-1 bg-transparent p-3 outline-none resize-none h-14 text-sm text-gray-200"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAgency(); } }}
              />
              <button onClick={runAgency} disabled={loading || !prompt} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white p-3 rounded-xl font-bold min-w-[50px] transition-colors">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : "➤"} 
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}