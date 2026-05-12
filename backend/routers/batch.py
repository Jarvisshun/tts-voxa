from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from models.schemas import BatchCreateRequest
from services.mimo_client import get_client_for_provider
from utils.audio import save_audio
from models.database import get_db
import aiosqlite
from utils.config import DATABASE_PATH
import uuid
import asyncio
import logging
import os

router = APIRouter()

logger = logging.getLogger(__name__)

# In-memory cache for active jobs (holds the client object)
active_jobs: dict[str, dict] = {}


@router.post("/create")
async def create_batch(req: BatchCreateRequest, db=Depends(get_db)):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    client = await get_client_for_provider(db)

    active_jobs[job_id] = {"client": client}

    await db.execute(
        "INSERT INTO batch_jobs (id, name, status, total_items, completed_items, voice, model, format, speed) VALUES (?, ?, 'pending', ?, 0, ?, ?, ?, ?)",
        (job_id, req.name, len(req.texts), req.voice, req.model, req.format.value, req.speed),
    )
    for i, text in enumerate(req.texts):
        item_id = f"bi_{uuid.uuid4().hex[:12]}"
        await db.execute(
            "INSERT INTO batch_items (id, job_id, item_index, text_content, status) VALUES (?, ?, ?, ?, 'pending')",
            (item_id, job_id, i, text),
        )
    await db.commit()

    asyncio.create_task(_process_batch(job_id))

    return {
        "success": True,
        "data": {"job_id": job_id, "total_items": len(req.texts)},
    }


@router.get("/list")
async def list_batches(db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM batch_jobs ORDER BY created_at DESC LIMIT 20"
    )
    rows = await cursor.fetchall()
    return {"success": True, "data": [dict(row) for row in rows]}


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM batch_jobs WHERE id = ?", (job_id,))
    job = await cursor.fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    items_cursor = await db.execute(
        "SELECT * FROM batch_items WHERE job_id = ? ORDER BY item_index",
        (job_id,),
    )
    items = await items_cursor.fetchall()

    return {
        "success": True,
        "data": {
            "job_id": dict(job)["id"],
            "name": dict(job)["name"],
            "status": dict(job)["status"],
            "total_items": dict(job)["total_items"],
            "completed_items": dict(job)["completed_items"],
            "results": [dict(item) for item in items],
        },
    }


@router.get("/{job_id}/items/{item_index}/audio")
async def get_batch_item_audio(job_id: str, item_index: int, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM batch_items WHERE job_id = ? AND item_index = ?",
        (job_id, item_index),
    )
    item = await cursor.fetchone()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item_dict = dict(item)
    if item_dict["status"] != "completed" or not item_dict["audio_path"]:
        raise HTTPException(status_code=404, detail="Audio not available")

    if not os.path.exists(item_dict["audio_path"]):
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(item_dict["audio_path"], media_type="audio/wav")


async def _process_batch(job_id: str):
    client = active_jobs.get(job_id, {}).get("client")
    if not client:
        return

    try:
        async with aiosqlite.connect(DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("UPDATE batch_jobs SET status = 'running' WHERE id = ?", (job_id,))
            await db.commit()

            cursor = await db.execute(
                "SELECT * FROM batch_items WHERE job_id = ? ORDER BY item_index",
                (job_id,),
            )
            items = await cursor.fetchall()

            job_cursor = await db.execute("SELECT * FROM batch_jobs WHERE id = ?", (job_id,))
            job_row = await job_cursor.fetchone()
            job = dict(job_row)

            for item in items:
                item_dict = dict(item)
                i = item_dict["item_index"]
                text = item_dict["text_content"]

                try:
                    result = await client.tts(
                        text=text,
                        model=job["model"],
                        voice=job["voice"],
                        format=job.get("format", "wav"),
                        speed=job.get("speed", 1.0),
                    )
                    audio_path = save_audio(result["audio"], job.get("format", "wav"), f"batch_{i}")

                    await db.execute(
                        "UPDATE batch_items SET status = 'completed', audio_path = ? WHERE id = ?",
                        (audio_path, item_dict["id"]),
                    )

                    gen_id = f"gen_{uuid.uuid4().hex[:12]}"
                    await db.execute(
                        "INSERT INTO generations (id, model, voice, text_content, audio_path, format, speed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (gen_id, job.get("model", "mimo-v2.5-tts"), job["voice"], text, audio_path, job.get("format", "wav"), job.get("speed", 1.0)),
                    )
                except Exception as e:
                    logger.error(f"Batch item {item_dict['id']} failed: {e}")
                    await db.execute(
                        "UPDATE batch_items SET status = 'failed', error_message = ? WHERE id = ?",
                        (str(e), item_dict["id"]),
                    )

                await db.execute(
                    "UPDATE batch_jobs SET completed_items = ? WHERE id = ?",
                    (i + 1, job_id),
                )
                await db.commit()

            await db.execute(
                "UPDATE batch_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
                (job_id,),
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Batch job {job_id} failed: {e}")
        try:
            async with aiosqlite.connect(DATABASE_PATH) as db:
                await db.execute("UPDATE batch_jobs SET status = 'failed' WHERE id = ?", (job_id,))
                await db.commit()
        except Exception:
            logger.error(f"Failed to mark batch job {job_id} as failed")
    finally:
        active_jobs.pop(job_id, None)
