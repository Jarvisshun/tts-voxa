from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from services.mimo_client import get_client_for_provider
from utils.audio import save_audio, read_audio_to_base64, get_audio_format
from utils.config import MAX_FILE_SIZE
from models.database import get_db
import uuid
import os

router = APIRouter()


@router.post("/synthesize")
async def clone_synthesize(
    audio: UploadFile = File(...),
    text: str = Form(...),
    format: str = Form(default="wav"),
    emotion: str = Form(default=None),
    db=Depends(get_db),
):
    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")

    audio_base64 = _encode_bytes(content)
    audio_fmt = get_audio_format(audio.filename or "audio.wav")

    try:
        client = await get_client_for_provider(db)
        result = await client.voice_clone(
            text=text,
            audio_base64=audio_base64,
            audio_format=audio_fmt,
            output_format=format,
            emotion=emotion,
        )
        audio_path = save_audio(result["audio"], format, "clone")
        gen_id = f"gen_{uuid.uuid4().hex[:12]}"

        return {
            "success": True,
            "data": {
                "audio": result["audio"],
                "format": format,
                "generation_id": gen_id,
                "audio_path": audio_path,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_clone_voice(
    audio: UploadFile = File(...),
    name: str = Form(...),
):
    content = await audio.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large (max 10MB)")

    os.makedirs("audio_store", exist_ok=True)
    voice_id = f"voice_{uuid.uuid4().hex[:12]}"
    fmt = get_audio_format(audio.filename or "audio.wav")
    filepath = f"audio_store/{voice_id}.{fmt}"

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "data": {"voice_id": voice_id, "name": name, "audio_path": filepath},
    }


def _encode_bytes(content: bytes) -> str:
    import base64
    return base64.b64encode(content).decode("utf-8")
