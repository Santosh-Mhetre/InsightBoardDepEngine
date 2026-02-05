from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from uuid import uuid4
import hashlib
from . import models, schemas, llm_adapter, validator
from .models import SessionLocal, engine, Base
import json
from datetime import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI(title="InsightBoard Dependency Engine")


class TranscriptIn(BaseModel):
    content: str


@app.post("/transcripts")
def create_transcript(payload: TranscriptIn, background_tasks: BackgroundTasks):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Transcript content is empty")
    h = hashlib.sha256(content.encode("utf-8")).hexdigest()
    db = SessionLocal()
    existing = db.query(models.Transcript).filter_by(hash=h).first()
    if existing:
        # Idempotency: if tasks already exist for this transcript, return existing completed job
        completed_job = db.query(models.Job).filter_by(transcript_id=existing.id, status="completed").first()
        if completed_job:
            return {"jobId": completed_job.id, "transcriptId": existing.id, "cached": True}
        # if no completed job exists but tasks exist, create a completed job with the tasks snapshot
        tasks = db.query(models.Task).filter_by(transcript_id=existing.id).all()
        if tasks:
            # build result
            task_list = []
            for task in tasks:
                try:
                    deps = json.loads(task.dependencies) if task.dependencies else []
                except Exception:
                    deps = []
                task_list.append(
                    {
                        "id": task.id,
                        "description": task.description,
                        "priority": task.priority,
                        "dependencies": deps,
                        "status": task.status,
                    }
                )
            job_id = str(uuid4())
            job = models.Job(id=job_id, transcript_id=existing.id, status="completed", result=json.dumps({"tasks": task_list}), created_at=datetime.utcnow())
            db.add(job)
            db.commit()
            db.refresh(job)
            return {"jobId": job.id, "transcriptId": existing.id, "cached": True}
        # otherwise create a new job and enqueue processing
    # create transcript row
    t = models.Transcript(id=str(uuid4()), content=content, hash=h, created_at=datetime.utcnow())
    db.add(t)
    db.commit()
    db.refresh(t)
    # create a job id (use uuid)
    job_id = str(uuid4())
    job = models.Job(id=job_id, transcript_id=t.id, status="pending", created_at=datetime.utcnow())
    db.add(job)
    db.commit()
    db.refresh(job)
    # enqueue background task
    background_tasks.add_task(process_transcript, t.id, job.id)
    return {"jobId": job.id, "transcriptId": t.id, "cached": False}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    db = SessionLocal()
    job = db.query(models.Job).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    res = {"id": job.id, "status": job.status, "transcript_id": job.transcript_id}
    if job.result:
        try:
            res["result"] = json.loads(job.result)
        except Exception:
            res["result"] = job.result
    return res


@app.get("/transcripts/{transcript_id}")
def get_transcript(transcript_id: str):
    db = SessionLocal()
    t = db.query(models.Transcript).filter_by(id=transcript_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcript not found")
    tasks = db.query(models.Task).filter_by(transcript_id=transcript_id).all()
    task_list = []
    for task in tasks:
        deps = []
        try:
            deps = json.loads(task.dependencies) if task.dependencies else []
        except Exception:
            deps = []
        task_list.append(
            {
                "id": task.id,
                "description": task.description,
                "priority": task.priority,
                "dependencies": deps,
                "status": task.status,
            }
        )
    return {"id": t.id, "content": t.content, "created_at": t.created_at.isoformat(), "tasks": task_list}


def process_transcript(transcript_id: str, job_id: str):
    db = SessionLocal()
    job = db.query(models.Job).filter_by(id=job_id).first()
    try:
        transcript = db.query(models.Transcript).filter_by(id=transcript_id).first()
        adapter = llm_adapter.get_adapter()
        raw = adapter.extract_tasks(transcript.content)
        # raw is expected to be a list of task dicts per strict schema
        tasks_validated = []
        # validate shape and types
        for item in raw:
            try:
                t = schemas.TaskSchema.parse_obj(item)
                tasks_validated.append(t.dict())
            except Exception as e:
                # skip invalid items defensively
                continue
        # sanitize dependencies and detect cycles
        tasks_sanitized, cycles = validator.sanitize_and_detect(tasks_validated)
        # persist tasks
        for t in tasks_sanitized:
            task = models.Task(
                id=t["id"],
                transcript_id=transcript_id,
                description=t["description"],
                priority=t["priority"],
                dependencies=json.dumps(t.get("dependencies", [])),
                status=t["status"],
            )
            db.merge(task)
        # update job result
        res = {"tasks": tasks_sanitized, "cycles": cycles}
        job.status = "completed"
        job.result = json.dumps(res)
        db.commit()
    except Exception as e:
        if job:
            job.status = "failed"
            job.result = str(e)
            db.commit()
    finally:
        db.close()

