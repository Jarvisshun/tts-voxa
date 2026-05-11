import base64
import uuid
import os
from utils.config import AUDIO_STORE_PATH


def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000, num_channels: int = 1, bits_per_sample: int = 16) -> bytes:
    import struct
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_bytes)
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + data_size, b'WAVE',
        b'fmt ', 16, 1, num_channels, sample_rate, byte_rate, block_align, bits_per_sample,
        b'data', data_size)
    return header + pcm_bytes


def save_audio(audio_base64: str, format: str = "wav", prefix: str = "tts") -> str:
    os.makedirs(AUDIO_STORE_PATH, exist_ok=True)
    audio_bytes = base64.b64decode(audio_base64)
    # PCM needs WAV header to be playable in browsers
    if format in ("pcm", "pcm16"):
        audio_bytes = pcm_to_wav(audio_bytes)
        format = "wav"
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.{format}"
    filepath = os.path.join(AUDIO_STORE_PATH, filename)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    return filepath


def read_audio_to_base64(filepath: str) -> str:
    with open(filepath, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_audio_format(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    if ext in ("wav", "mp3", "pcm", "pcm16", "webm", "ogg"):
        return ext
    return "wav"
