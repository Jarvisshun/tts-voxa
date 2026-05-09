from fastapi import APIRouter, HTTPException
from models.schemas import VoiceDesignRequest
from services.mimo_client import mimo_client
from utils.audio import save_audio
import uuid

router = APIRouter()


@router.post("/generate")
async def generate_voice(req: VoiceDesignRequest):
    try:
        result = await mimo_client.voice_design(
            description=req.description,
            text=req.text,
            format=req.format.value,
        )
        audio_path = save_audio(result["audio"], req.format.value, "design")
        gen_id = f"gen_{uuid.uuid4().hex[:12]}"

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
