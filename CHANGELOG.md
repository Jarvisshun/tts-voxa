# Changelog

## v2.1.0 (2026-05-11)

### New Features
- **Standalone Desktop App**: Exe now opens in a native OS window (Edge WebView2) instead of external browser
- **Auto-Update Check**: Settings page checks GitHub for new releases with download link

### Backend Changes
- Added `pywebview` for native window rendering in exe mode
- Server binds to `127.0.0.1` in exe mode (not exposed to network)
- Window auto-closes server on exit
- Updated GitHub repo reference to `tts-voxa`

### Build Changes
- Added `--windowed` flag to PyInstaller (no console window)
- Added `pywebview` to requirements and hidden imports

## v2.0.1 (2026-05-11)

### New Features
- **Auto-Update Check**: Settings page now shows current version and checks GitHub for new releases
  - One-click "检查更新" button queries GitHub Releases API
  - Shows release notes and download link when a new version is available
  - Graceful degradation when GitHub API is unreachable

### Backend Changes
- Added `GET /api/version` endpoint returning current version
- Added `GET /api/update/check` endpoint comparing with GitHub Releases (10-minute cache)
- Extracted `__version__` constant for centralized version management

### Frontend Changes
- New "关于 TTS Voxa" section in Settings page with version display and update checker

## v2.0.0 (2026-05-10)

### New Features
- **Sidebar Navigation**: Replaced horizontal tab bar with vertical sidebar (ElevenLabs / Fish Audio style)
- **Task Panel**: Real-time task status display in sidebar, cross-page tracking
- **Microphone Recording**: Record reference audio directly in Voice Clone page with device selection and real-time waveform
- **Persistent Batch Tasks**: Batch jobs saved to SQLite database, survive page switches and server restarts
- **Batch Result Playback**: Play/download individual audio segments after batch completion
- **Batch History**: View and expand previous batch jobs with full result playback
- **Waveform Player**: All audio players upgraded to WaveSurfer.js waveform visualization (replaces native `<audio>` elements)
- **History Fix**: All synthesis operations (TTS, Clone, Design, Batch) now properly recorded in history

### Backend Changes
- Added `batch_items` table for per-segment batch results
- Added `format`/`speed` columns to `batch_jobs` table
- Batch jobs persisted to SQLite (was in-memory dict)
- Batch processing writes to `generations` table for history
- Added `GET /api/batch/list` endpoint
- Added `GET /api/batch/{job_id}/items/{item_index}/audio` endpoint
- Added `GET /api/history/tasks` endpoint for task panel
- Enabled SQLite WAL mode for better concurrency
- Added database migration for existing installations

### Frontend Changes
- New `TaskContext` provider for global task state management
- New `Sidebar` component with navigation + task panel
- New `WaveformPlayer` component using wavesurfer.js
- New `AudioRecorder` component with MediaRecorder API + device enumeration
- New `blobToWavFile` utility for WebM-to-WAV conversion
- Refactored `App.tsx` layout from horizontal tabs to sidebar
- Updated `BatchProcess` to use TaskContext and show audio playback
- Updated `VoiceClone` with upload/record toggle
- Updated `TTSWorkbench`, `VoiceDesign`, `History` to use WaveformPlayer

## v1.1.0 (2026-05-09)

- Renamed app to "TTS Voxa"
- Complete UI redesign from dark theme to premium light design
- Multi-provider model configuration with Settings UI

## v1.0.0

- Initial release
- TTS synthesis with 9 preset voices
- Voice cloning from reference audio
- Voice design from text description
- Batch text-to-speech processing
- Generation history
- SQLite storage
- PyInstaller exe packaging
