import json
import platform
platform.machine = lambda: "AMD64"  # WMI freeze issue bypass
import io
import zipfile
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from agency.graph import app_agency
from database import RunHistory, get_db

app = FastAPI(title="AutoDev Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgencyRequest(BaseModel):
    task_description: str
    thread_id: str
    previous_code: Optional[dict] = None 

async def stream_generator(task, db, previous_code):
    try:
        initial_state = {
            "task_description": task, 
            "current_phase": "Architecture",
            "generated_code": previous_code or {},
            "validation_errors": [],
            "revision_count": 0
        }
        
        final_result = {"generated_code": {}} # Fix for dictionary overwrite bug

        async for event in app_agency.astream(initial_state):
            for node_name, output in event.items():
                
         
                if "generated_code" in output:
                    final_result["generated_code"].update(output["generated_code"])
                if "current_phase" in output:
                    final_result["current_phase"] = output["current_phase"]

                payload = {
                    "node": node_name,
                    "current_phase": output.get("current_phase", "Processing..."),
                    "generated_code": final_result["generated_code"] 
                }
                yield f"data: {json.dumps(payload)}\n\n"
                await asyncio.sleep(0.1)

        # After process complete save in Database
        new_run = RunHistory(
            task_description=task,
            generated_code=json.dumps(final_result.get("generated_code", {}))
        )
        db.add(new_run)
        db.commit()
        db.refresh(new_run)
        
        yield f"data: {json.dumps({'run_id': new_run.id, 'status': 'completed'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'current_phase': f'❌ Backend Error: {str(e)}'})}\n\n"

@app.post("/api/v1/run-agency")
async def run_agency(request: AgencyRequest, db: Session = Depends(get_db)):
    return StreamingResponse(
        stream_generator(request.task_description, db, request.previous_code), 
        media_type="text/event-stream"
    )

@app.get("/api/v1/history")
def get_history(db: Session = Depends(get_db)):
    history = db.query(RunHistory).order_by(RunHistory.id.desc()).all()
    return [{"id": item.id, "prompt": item.task_description, "generated_code": item.generated_code} for item in history]

@app.get("/api/v1/download/{run_id}")
def download_project(run_id: int, db: Session = Depends(get_db)):
    db_run = db.query(RunHistory).filter(RunHistory.id == run_id).first()
    if not db_run:
        raise HTTPException(status_code=404, detail="Project not found")
        
    code_dict = json.loads(db_run.generated_code)
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for filepath, code in code_dict.items():
            zip_file.writestr(filepath, code.strip())
            
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=Project_{run_id}.zip"}
    )