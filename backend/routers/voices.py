from fastapi import APIRouter, HTTPException, Depends
from models.database import get_db
from models.schemas import VoiceCreate
import uuid

router = APIRouter()


@router.get("")
async def list_voices(db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM voices ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    return {
        "success": True,
        "data": [dict(row) for row in rows],
    }


@router.post("")
async def save_voice(voice: VoiceCreate, db=Depends(get_db)):
    voice_id = f"voice_{uuid.uuid4().hex[:12]}"
    await db.execute(
        "INSERT OR REPLACE INTO voices (id, name, type, voice_id, description, audio_path) VALUES (?, ?, ?, ?, ?, ?)",
        (voice_id, voice.name, voice.type, voice.voice_id, voice.description, voice.audio_path),
    )
    await db.commit()
    return {"success": True, "data": {"id": voice_id, "name": voice.name}}


@router.delete("/{voice_id}")
async def delete_voice(voice_id: str, db=Depends(get_db)):
    cursor = await db.execute("DELETE FROM voices WHERE id = ?", (voice_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Voice not found")
    return {"success": True}
