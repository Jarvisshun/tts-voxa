import base64
import uuid
import os
from utils.config import AUDIO_STORE_PATH


def save_audio(audio_base64: str, format: str = "wav", prefix: str = "tts") -> str:
    os.makedirs(AUDIO_STORE_PATH, exist_ok=True)
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.{format}"
    filepath = os.path.join(AUDIO_STORE_PATH, filename)
    audio_bytes = base64.b64decode(audio_base64)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    return filepath


def read_audio_to_base64(filepath: str) -> str:
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_audio_format(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    if ext in ("wav", "mp3", "pcm", "pcm16"):
        return ext
    return "wav"
