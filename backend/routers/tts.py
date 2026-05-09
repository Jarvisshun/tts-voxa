from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest
from services.mimo_client import mimo_client
from utils.audio import save_audio
from models.database import get_db
import uuid
import json

router = APIRouter()


@router.post("/synthesize")
async def synthesize(req: TTSRequest):
    try:
        result = await mimo_client.tts(
            text=req.text,
            model=req.model,
            voice=req.voice,
            format=req.format.value,
            speed=req.speed,
            emotion=req.emotion,
        )
        audio_path = save_audio(result["audio"], req.format.value, "tts")
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def synthesize_stream(req: TTSRequest):
    async def event_generator():
        try:
            async for chunk in mimo_client.tts_stream(
                text=req.text,
                model=req.model,
                voice=req.voice,
                format=req.format.value,
                speed=req.speed,
                emotion=req.emotion,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
