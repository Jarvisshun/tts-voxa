"""Build script for packaging TTS Voxa as a Windows exe."""
import subprocess
import sys
import os
import shutil
import stat

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Install PyInstaller
subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "pywebview", "--quiet"])

APP_NAME = "TTS Voxa"
TEMP_DIST = "_dist_temp"
FINAL_DIST = "dist"

def _onerror(func, path, exc):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

# Clean old temp, release, build dirs and spec files
for d in [TEMP_DIST, "build"] + [f for f in os.listdir(".") if f.startswith("_release")]:
    if os.path.exists(d):
        shutil.rmtree(d, onerror=_onerror)
for f in os.listdir("."):
    if f.endswith(".spec"):
        try:
            os.remove(f)
        except Exception:
            pass

# Build to temp directory
subprocess.check_call([
    sys.executable, "-m", "PyInstaller",
    "--noconfirm",
    "--onedir",
    "--windowed",
    "--name", APP_NAME,
    "--distpath", TEMP_DIST,
    "--exclude-module", "tkinter",
    "--exclude-module", "_tkinter",
    "--exclude-module", "matplotlib",
    "--exclude-module", "IPython",
    "--exclude-module", "ipykernel",
    "--exclude-module", "jupyter",
    "--exclude-module", "nbformat",
    "--exclude-module", "nbconvert",
    "--exclude-module", "notebook",
    "--add-data", "../VERSION;.",
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
    "--hidden-import", "webview",
    "--hidden-import", "webview.platforms",
    "--hidden-import", "webview.platforms.edgechromium",
    "main.py",
])

# Move result to dist/
src = os.path.join(TEMP_DIST, APP_NAME)
dst = os.path.join(FINAL_DIST, APP_NAME)

# Try to remove old dist
if os.path.exists(FINAL_DIST):
    shutil.rmtree(FINAL_DIST, onerror=_onerror)

if os.path.exists(FINAL_DIST):
    # Old dist is locked — try alternate names
    import time
    for suffix in ["_release", f"_release_{int(time.time())}"]:
        if not os.path.exists(suffix):
            os.rename(TEMP_DIST, suffix)
            release_dst = os.path.join(suffix, APP_NAME)
            print(f"\nBuild complete! (old dist locked, output to: {os.path.join(os.getcwd(), release_dst)})")
            break
    else:
        print("\nBuild complete in _dist_temp (could not rename)")

else:
    os.rename(TEMP_DIST, FINAL_DIST)
    print(f"\nBuild complete! Output: {os.path.join(os.getcwd(), dst)}")
