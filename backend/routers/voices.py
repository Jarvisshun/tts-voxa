from fastapi import APIRouter, HTTPException
from models.database import get_db
import aiosqlite
from utils.config import DATABASE_PATH
import os

router = APIRouter()


@router.get("")
async def list_voices():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM voices ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        return {
            "success": True,
            "data": [dict(row) for row in rows],
        }


@router.post("")
async def save_voice(voice: dict):
    import uuid

    voice_id = voice.get("id", f"voice_{uuid.uuid4().hex[:12]}")
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO voices (id, name, type, voice_id, description, audio_path) VALUES (?, ?, ?, ?, ?, ?)",
            (
                voice_id,
                voice["name"],
                voice["type"],
                voice.get("voice_id"),
                voice.get("description"),
                voice.get("audio_path"),
            ),
        )
        await db.commit()
    return {"success": True, "data": {"id": voice_id, "name": voice["name"]}}


@router.delete("/{voice_id}")
async def delete_voice(voice_id: str):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute("DELETE FROM voices WHERE id = ?", (voice_id,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Voice not found")
    return {"success": True}
