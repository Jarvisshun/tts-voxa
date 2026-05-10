from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import aiosqlite
from utils.config import DATABASE_PATH

router = APIRouter()


@router.get("")
async def list_history(page: int = 1, limit: int = 20):
    offset = (page - 1) * limit
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        rows = await cursor.fetchall()
        count_cursor = await db.execute("SELECT COUNT(*) FROM generations")
        total = (await count_cursor.fetchone())[0]

        return {
            "success": True,
            "data": {
                "items": [dict(row) for row in rows],
                "total": total,
                "page": page,
                "limit": limit,
            },
        }


@router.get("/tasks")
async def get_recent_tasks(limit: int = 20):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        gen_cursor = await db.execute(
            "SELECT id, model, text_content, created_at FROM generations ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        gen_rows = await gen_cursor.fetchall()

        batch_cursor = await db.execute(
            "SELECT id, name, status, total_items, completed_items, created_at FROM batch_jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        batch_rows = await batch_cursor.fetchall()

        tasks = []
        for row in gen_rows:
            r = dict(row)
            tasks.append({
                "id": r["id"],
                "type": r["model"] if r["model"] in ("clone", "design") else "tts",
                "status": "completed",
                "text_preview": r["text_content"][:60] if r["text_content"] else "",
                "created_at": r["created_at"],
            })
        for row in batch_rows:
            r = dict(row)
            tasks.append({
                "id": r["id"],
                "type": "batch",
                "status": r["status"],
                "text_preview": r["name"],
                "created_at": r["created_at"],
                "progress": {"current": r["completed_items"], "total": r["total_items"]},
            })

        tasks.sort(key=lambda x: x["created_at"] or "", reverse=True)
        return {"success": True, "data": tasks[:limit]}


@router.get("/{generation_id}/audio")
async def get_generation_audio(generation_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM generations WHERE id = ?", (generation_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Generation not found")

        audio_path = dict(row)["audio_path"]
        import os

        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="Audio file not found")

        return FileResponse(audio_path, media_type="audio/wav")
