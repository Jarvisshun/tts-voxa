from fastapi import APIRouter, HTTPException
from models.schemas import BatchCreateRequest
from services.mimo_client import mimo_client
from utils.audio import save_audio
import uuid
import asyncio

router = APIRouter()

batch_jobs: dict[str, dict] = {}


@router.post("/create")
async def create_batch(req: BatchCreateRequest):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    batch_jobs[job_id] = {
        "job_id": job_id,
        "name": req.name,
        "status": "pending",
        "total_items": len(req.texts),
        "completed_items": 0,
        "voice": req.voice,
        "model": req.model,
        "format": req.format.value,
        "speed": req.speed,
        "texts": req.texts,
        "results": [],
    }

    asyncio.create_task(_process_batch(job_id))

    return {
        "success": True,
        "data": {"job_id": job_id, "total_items": len(req.texts)},
    }


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str):
    job = batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "success": True,
        "data": {
            "job_id": job["job_id"],
            "name": job["name"],
            "status": job["status"],
            "total_items": job["total_items"],
            "completed_items": job["completed_items"],
            "results": job["results"],
        },
    }


async def _process_batch(job_id: str):
    job = batch_jobs[job_id]
    job["status"] = "running"

    for i, text in enumerate(job["texts"]):
        try:
            result = await mimo_client.tts(
                text=text,
                model=job["model"],
                voice=job["voice"],
                format=job["format"],
                speed=job["speed"],
            )
            audio_path = save_audio(result["audio"], job["format"], f"batch_{i}")
            job["results"].append(
                {"index": i, "audio_path": audio_path, "status": "completed"}
            )
        except Exception as e:
            job["results"].append(
                {"index": i, "error": str(e), "status": "failed"}
            )
        job["completed_items"] = i + 1

    job["status"] = "completed"
