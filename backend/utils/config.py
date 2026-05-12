import os
import sys
from dotenv import load_dotenv

load_dotenv()

def _get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

def _get_api_key():
    key = os.getenv("MIMO_API_KEY", "")
    if key and key != "your_api_key_here":
        return key
    return ""

MIMO_API_KEY = _get_api_key()
MIMO_API_BASE = os.getenv("MIMO_API_BASE", "https://token-plan-cn.xiaomimimo.com/v1")
_BASE_DIR = _get_base_dir()
AUDIO_STORE_PATH = os.getenv("AUDIO_STORE_PATH", os.path.join(_BASE_DIR, "audio_store"))
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(_BASE_DIR, "data.db"))

MAX_TEXT_LENGTH = 5000
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
