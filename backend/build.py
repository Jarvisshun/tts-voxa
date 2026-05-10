"""Build script for packaging MiMo TTS Studio as a Windows exe."""
import subprocess
import sys
import os
import shutil
import stat

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Install PyInstaller
subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "--quiet"])

APP_NAME = "MiMo TTS Studio"
DIST_DIR = "dist"
BUILD_DIR = "build"

# Try to clean old dist/build, but don't fail if locked
for d in [DIST_DIR, BUILD_DIR]:
    if os.path.exists(d):
        def _onerror(func, path, exc):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass
        shutil.rmtree(d, onerror=_onerror)

# Build to a temp dist path to avoid locked-directory issues
TEMP_DIST = "_dist_temp"
subprocess.check_call([
    sys.executable, "-m", "PyInstaller",
    "--noconfirm",
    "--onedir",
    "--name", APP_NAME,
    "--distpath", TEMP_DIST,
    "--add-data", "static;static",
    "--add-data", "routers;routers",
    "--add-data", "services;services",
    "--add-data", "models;models",
    "--add-data", "utils;utils",
    "--hidden-import", "uvicorn.logging",
    "--hidden-import", "uvicorn.loops",
    "--hidden-import", "uvicorn.loops.auto",
    "--hidden-import", "uvicorn.protocols",
    "--hidden-import", "uvicorn.protocols.http",
    "--hidden-import", "uvicorn.protocols.http.auto",
    "--hidden-import", "uvicorn.protocols.websockets",
    "--hidden-import", "uvicorn.protocols.websockets.auto",
    "--hidden-import", "uvicorn.lifespan",
    "--hidden-import", "uvicorn.lifespan.on",
    "main.py",
])

# Move result to dist/
os.makedirs(DIST_DIR, exist_ok=True)
src = os.path.join(TEMP_DIST, APP_NAME)
dst = os.path.join(DIST_DIR, APP_NAME)
if os.path.exists(dst):
    shutil.rmtree(dst, onerror=_onerror)
shutil.move(src, dst)
shutil.rmtree(TEMP_DIST, ignore_errors=True)

print("\nBuild complete!")
print(f"Output: {os.path.join(os.getcwd(), dst)}")
