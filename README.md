# 🚀 AutoDev Studio: Autonomous Multi-Agent Software Engineering Framework

![Architecture](https://img.shields.io/badge/Architecture-LangGraph-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Next.js-61DAFB)
![AI](https://img.shields.io/badge/AI_Engine-Gemini%20%7C%20Llama3-FF6F00)

## 📌 Abstract
**AutoDev Studio** is an advanced, autonomous multi-agent system designed to completely automate the software development lifecycle. By leveraging **LangGraph** for stateful orchestration, the system deploys specialized AI agents (Frontend & Backend) to write, review, and compile full-stack code in parallel. 

It features a real-time **Server-Sent Events (SSE)** streaming architecture that feeds generated code directly into a sandboxed live-preview environment (**Sandpack**) running in the browser.

## 🏗️ System Architecture & Design

The core of AutoDev Studio is built on a **Supervisor/Orchestrator Pattern**:
1. **The Orchestrator Node:** Acts as the deterministic router. It parses user intent, initializes the global `AgencyState`, and dispatches tasks to worker nodes.
2. **Parallel Execution (Fan-out/Fan-in):** To minimize latency, the Frontend Agent (Next.js/React) and Backend Agent (FastAPI) execute concurrently.
3. **Event-Driven Streaming:** As code is generated, the FastAPI backend streams chunks via SSE to the client, preventing connection timeouts and ensuring a highly responsive UI.
4. **Live DOM Injection:** The React client parses the incoming JSON stream, remaps Next.js/React components to a virtual file system, and injects them into a `Sandpack` instance for zero-latency live compilation.

### 🔄 Data Flow (Mermaid)
```mermaid
graph TD;
    Client[React Client] -->|Task Prompt| API[FastAPI Endpoint];
    API -->|Init State| Orchestrator[Orchestrator Node];
    Orchestrator -->|Parallel Dispatch| FE[Frontend Coder Agent];
    Orchestrator -->|Parallel Dispatch| BE[Backend Coder Agent];
    FE -->|Code Chunk| StateBuffer[State Manager];
    BE -->|Code Chunk| StateBuffer[State Manager];
    StateBuffer -->|SSE Stream| UI[Frontend UI];
    UI -->|Compile| Sandbox[Sandpack Live Preview];

🛠️ Tech Stack
Backend Infrastructure:

Python 3.12+: Core runtime.

FastAPI & Uvicorn: High-performance asynchronous API and SSE streaming.

LangGraph: State machine mapping and multi-agent cyclic graph execution.

SQLAlchemy & SQLite: Persistence layer for project history and run logs.

Frontend Interface:

Next.js (App Router) / React 18: UI framework.

Tailwind CSS: Utility-first styling.

@codesandbox/sandpack-react: In-browser bundler and live preview engine.

React Syntax Highlighter: Code snippet rendering.

AI & LLMs:

LangChain / LangChain-Google-GenAI: Model abstraction layer.

Google Gemini 2.5 Flash / Groq (Llama-3): Core reasoning and code generation engines.

🚀 Getting Started
Prerequisites
Python 3.10 or higher

Node.js 18+

API Keys: Google Gemini (or Groq)

1. Backend Setup
Bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/AutoDev-Studio-AI.git](https://github.com/YOUR_USERNAME/AutoDev-Studio-AI.git)
cd AutoDev-Studio-AI/backend

# Create virtual environment & install dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Environment Variables
# Create a .env file in the backend root and add:
GOOGLE_API_KEY=your_api_key_here

# Start the FastAPI Server
uvicorn app.main:app --reload
2. Frontend Setup
Bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
The UI will be available at http://localhost:3000 and the API docs at http://localhost:8000/docs.

📦 Features
Real-Time Parallel Coding: Watch AI agents write frontend and backend code simultaneously.

Sandboxed Live Preview: Instantly see the generated React UI rendered in a secure iframe.

Automatic Routing Fallbacks: Automatically wraps generated React components in BrowserRouter if routing is detected.

One-Click Export: Download the entire generated project (Frontend + Backend) as a cleanly structured .zip file.

Persistent History: All generated projects are saved to an SQLite database for easy retrieval.
