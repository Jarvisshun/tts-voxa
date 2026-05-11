import os
import json
from dotenv import load_dotenv

load_dotenv()

# Try to read API key from .claude/settings.json if not in env
def _get_api_key():
    key = os.getenv("MIMO_API_KEY", "")
    if key and key != "your_api_key_here":
        return key
    # Fallback: read from .claude/settings.json
    try:
        # Try multiple possible paths
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", ".claude", "settings.json"),
            os.path.join("E:/XiaoMi Mimo develop", ".claude", "settings.json"),
        ]
        for settings_path in possible_paths:
            if os.path.exists(settings_path):
                with open(settings_path) as f:
                    settings = json.load(f)
                return settings.get("env", {}).get("ANTHROPIC_AUTH_TOKEN", "")
    except:
        pass
    return ""

MIMO_API_KEY = _get_api_key()
MIMO_API_BASE = os.getenv("MIMO_API_BASE", "https://token-plan-cn.xiaomimimo.com/v1")
AUDIO_STORE_PATH = os.getenv("AUDIO_STORE_PATH", "./audio_store")
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data.db")

MAX_TEXT_LENGTH = 5000
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
