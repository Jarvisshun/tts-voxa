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
