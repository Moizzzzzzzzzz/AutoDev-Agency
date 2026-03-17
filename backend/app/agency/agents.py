import os
import asyncio
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from agency.state import AgencyState


load_dotenv() 
load_dotenv("../../../.env") 

api_key = os.getenv("GOOGLE_API_KEY")

coder_llm = ChatGroq(
    model="openai/gpt-oss-120b", 
    temperature=0.2,
    api_key=os.getenv("GROQ_API_KEY") 
)
async def orchestrator_node(state: AgencyState):
    current_phase = state.get("current_phase", "Architecture")
    code_exists = bool(state.get("generated_code"))
    retries = state.get("revision_count", 0)
    
    print(f"\n🧠 [Orchestrator] Phase: {current_phase} | Retries: {retries}")
    

    if "❌" in current_phase:
        return {"current_phase": "END", "log": "Fatal Error in Developers. Stopping."}

    if retries > 1:
        return {"current_phase": "END", "log": "Max retries reached."}

    
    if not code_exists or current_phase == "Architecture":
        return {
            "current_phase": "Parallel_Dev", 
            "log": "Routing to Devs",
            "revision_count": retries + 1
        }
    
    return {"current_phase": "END", "log": "Completed"}


async def dev_fe_node(state: AgencyState):
    print("💻 [Frontend Agent] Next.js ka code likh raha hai...")
    try:
        prompt = f"Lead Frontend Dev. Task: {state.get('task_description')}. Write ONLY raw React code for App.js. Do not use markdown blocks."
        response = await coder_llm.ainvoke([HumanMessage(content=prompt)])
        
        code = response.content.replace("```tsx", "").replace("```javascript", "").replace("```", "").strip()
        print("✅ [Frontend Agent] Code Complete!")
        return {"generated_code": {"frontend/src/app/page.tsx": code}, "current_phase": "Done_FE"}
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ [FE Error] {error_msg}")
        return {"current_phase": f"❌ FE Error: {error_msg[:60]}"}


async def dev_be_node(state: AgencyState):
    
    await asyncio.sleep(2) 
    print("⚙️ [Backend Agent] FastAPI ka code likh raha hai...")
    try:
        prompt = f"Lead FastAPI Dev. Task: {state.get('task_description')}. Write ONLY raw Python code. Do not use markdown blocks."
        response = await coder_llm.ainvoke([HumanMessage(content=prompt)])
        
        code = response.content.replace("```python", "").replace("```", "").strip()
        print("✅ [Backend Agent] Code Complete!")
        return {"generated_code": {"backend/app/api/endpoints.py": code}, "current_phase": "Done_BE"}
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ [BE Error] {error_msg}")
        return {"current_phase": f"❌ BE Error: {error_msg[:60]}"}