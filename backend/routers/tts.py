from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from models.schemas import TTSRequest
from services.mimo_client import get_client_for_provider
from utils.audio import save_audio
from models.database import get_db
import uuid
import json

router = APIRouter()


@router.post("/synthesize")
async def synthesize(req: TTSRequest, db=Depends(get_db)):
    try:
        client = await get_client_for_provider(db)
        result = await client.tts(
            text=req.text,
            model=req.model,
            voice=req.voice,
            format=req.format.value,
            speed=req.speed,
            emotion=req.emotion,
        )
        save_format = req.format.value
        audio_path = save_audio(result["audio"], save_format, "tts")
        # PCM gets converted to WAV in save_audio
        if save_format in ("pcm", "pcm16"):
            save_format = "wav"
        gen_id = f"gen_{uuid.uuid4().hex[:12]}"

        await db.execute(
            "INSERT INTO generations (id, model, voice, text_content, audio_path, format, speed, emotion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (gen_id, req.model, req.voice, req.text, audio_path, save_format, req.speed, req.emotion),
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "audio": result["audio"],
                "format": save_format,
                "generation_id": gen_id,
                "audio_path": audio_path,
            },
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def synthesize_stream(req: TTSRequest, db=Depends(get_db)):
    client = await get_client_for_provider(db)

    async def event_generator():
        try:
            async for chunk in client.tts_stream(
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
