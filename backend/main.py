from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.routing import NoMatchFound
import uvicorn
import os
import sys
import webbrowser
import threading

from routers import tts, clone, design, batch, voices, history, config
from models.database import init_db


def get_base_dir():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = get_base_dir()

app = FastAPI(title="MiMo TTS Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])
app.include_router(clone.router, prefix="/api/clone", tags=["Voice Clone"])
app.include_router(design.router, prefix="/api/design", tags=["Voice Design"])
app.include_router(batch.router, prefix="/api/batch", tags=["Batch"])
app.include_router(voices.router, prefix="/api/voices", tags=["Voices"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(config.router, prefix="/api/config", tags=["Config"])

audio_dir = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "audio_store")
os.makedirs(audio_dir, exist_ok=True)
app.mount("/audio", StaticFiles(directory=audio_dir), name="audio")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/voices/presets")
async def get_preset_voices():
    return {
        "success": True,
        "data": [
            {"id": "mimo_default", "name": "默认", "style": "标准音色"},
            {"id": "冰糖", "name": "冰糖", "style": "甜美女声"},
            {"id": "茉莉", "name": "茉莉", "style": "温柔女声"},
            {"id": "苏打", "name": "苏打", "style": "活泼女声"},
            {"id": "白桦", "name": "白桦", "style": "沉稳男声"},
            {"id": "Mia", "name": "Mia", "style": "英文女声"},
            {"id": "Chloe", "name": "Chloe", "style": "英文女声"},
            {"id": "Milo", "name": "Milo", "style": "英文男声"},
            {"id": "Dean", "name": "Dean", "style": "英文男声"},
        ],
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


static_dir = os.path.join(BASE_DIR, "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(static_dir, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))


def open_browser():
    import time
    time.sleep(1.5)
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    if getattr(sys, "frozen", False):
        threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
