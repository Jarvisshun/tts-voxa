from fastapi import APIRouter, HTTPException, Depends
from models.schemas import VoiceDesignRequest
from services.mimo_client import get_client_for_provider
from utils.audio import save_audio
from models.database import get_db
import uuid

router = APIRouter()


@router.post("/generate")
async def generate_voice(req: VoiceDesignRequest, db=Depends(get_db)):
    try:
        client = await get_client_for_provider(db)
        result = await client.voice_design(
            description=req.description,
            text=req.text,
            format=req.format.value,
        )
        audio_path = save_audio(result["audio"], req.format.value, "design")
        gen_id = f"gen_{uuid.uuid4().hex[:12]}"

        await db.execute(
            "INSERT INTO generations (id, model, voice, text_content, audio_path, format) VALUES (?, ?, ?, ?, ?, ?)",
            (gen_id, "design", None, req.text, audio_path, req.format.value),
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "audio": result["audio"],
                "format": req.format.value,
                "generation_id": gen_id,
                "audio_path": audio_path,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
