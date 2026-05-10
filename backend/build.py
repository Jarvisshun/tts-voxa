"""Build script for packaging MiMo TTS Studio as a Windows exe."""
import subprocess
import sys
import os
import shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Install PyInstaller
subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "--quiet"])

# Build
subprocess.check_call([
    sys.executable, "-m", "PyInstaller",
    "--noconfirm",
    "--onedir",
    "--name", "MiMo TTS Studio",
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

print("\nBuild complete!")
print(f"Output: {os.path.join(os.getcwd(), 'dist', 'MiMo TTS Studio')}")
