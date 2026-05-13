# Changelog

## v2.3.0 (2026-05-13)

### New Features
- **Cloud Sync**: Supabase-powered cross-device data synchronization
  - Email login/register/magic link authentication
  - Offline-first sync engine — local SQLite primary, background push/pull to Supabase
  - Row-Level Security (RLS) — users can only access their own data
  - Audio files encrypted with AES-GCM-256 before upload (end-to-end encryption)
  - API keys encrypted client-side before storage
  - Configurable Supabase URL and anon key in Settings
  - Manual sync button + automatic sync after writes
- **Local DB Schema Upgrade**: Added `user_id`, `updated_at`, `synced` columns to all tables with automatic migration

### Dependencies
- Added `@supabase/supabase-js` (~50KB gzipped)

## v2.2.5 (2026-05-13)

### Bug Fixes
- **Android crash**: Fixed 5 root causes — removed broken `applyPolyfills`, wrapped `initDatabase` in try/catch, disabled SQLite encryption, added `base: './'` to Vite config
- **Audio download**: Fixed download button on all platforms — Android now uses system share sheet via `@capacitor/share`, desktop uses blob download
- **API key visibility**: Added eye icon toggle to show/hide API key in Settings (works on both desktop and mobile)

## v2.2.4 (2026-05-13)

### Bug Fixes
- **Desktop EXE**: Fixed static files not found — `frontend/dist` was bundled as `frontend/dist` instead of `static` in PyInstaller
- **Android crash**: Fixed app crash on launch — `jeep-sqlite` was loaded from unpkg.com CDN which is blocked in China, now loaded from local package

### Code Quality
- Migrated from deprecated `@app.on_event("startup")` to FastAPI `lifespan` context manager
- Separated `pywebview` into `requirements-desktop.txt` (build-only dependency)
- Replaced all `any` types in `client.ts` with proper TypeScript interfaces
- Added type definitions: `BatchJobStatus`, `HistoryItem`, `TaskItem`, `Provider`, `ModelConfig`

### Engineering
- Added GitHub Actions CI workflow (frontend type-check + backend import checks)

## v2.2.3 (2026-05-12)

### Code Quality
- Migrated from deprecated `@app.on_event("startup")` to FastAPI `lifespan` context manager
- Separated `pywebview` into `requirements-desktop.txt` (build-only dependency)
- Replaced all `any` types in `client.ts` with proper TypeScript interfaces
- Added type definitions: `BatchJobStatus`, `HistoryItem`, `TaskItem`, `Provider`, `ModelConfig`

### Engineering
- Added GitHub Actions CI workflow (frontend type-check + backend import checks)
- Updated `gh auth` with `workflow` scope for CI file pushes

## v2.2.3 (2026-05-12)

### Bug Fixes
- **Native cloneSave**: Fixed audio file not being written to storage on Android
- **Native batch processing**: Fixed `saveAudio` return value being discarded, causing "audio not found" errors
- **getRecentTasks**: Fixed SQL query referencing non-existent `status` column on native
- **BatchProcess**: Fixed stale closure in `loadNativeAudioUrl` dedup check
- **blobToWavFile**: Added guard for `AudioContext` creation failure on Android WebView
- **Backend audio path**: Unified `audio_dir` path between `main.py` and `config.py` (fixes exe mode)

### Security
- Moved Android keystore passwords from `build.gradle` to `local.properties` (gitignored)
- Removed `.claude/settings.json` API key fallback from backend config
- Restricted CORS from `allow_origins=["*"]` to localhost only
- Added Pydantic input validation to voices save endpoint
- Changed dev server binding from `0.0.0.0` to `127.0.0.1`

### Code Quality
- Refactored `batch.py` to use FastAPI `Depends(get_db)` instead of direct DB connections
- Fixed `active_jobs` memory leak with `finally` block cleanup
- Replaced silent `catch {}` blocks with error logging
- Removed unused `react-router-dom` dependency (~40KB bundle savings)
- Removed dead code: `VoiceSaveRequest` schema, `mimo_client` singleton
- Extracted `dataUrlToBase64` to shared `utils/audio.ts`
- Used existing `bytesToBase64` instead of manual byte-by-byte encoding
- Fixed animation frame leak in `drawNativeWaveform`
- Optimized canvas rendering (hoisted `roundRect` check and `fillStyle`)
- Fixed polling interval feedback loop in `TaskContext`

### Engineering
- Unified version to single source of truth (`VERSION` file)
- Updated CHANGELOG for v2.2.0-v2.2.3

## v2.2.2 (2026-05-12)

### Bug Fixes
- Fixed download buttons on all pages (TTS, Clone, Design, Batch, History)
- Fixed mobile recording: replaced `getUserMedia` with native `TtsVoxaMicrophone` Capacitor plugin
- Fixed task panel polling interval thrashing
- Fixed desktop exe static file path resolution

### Code Review
- Applied code review fixes: null guards, memory leak prevention, deduplication

## v2.2.1 (2026-05-12)

### Bug Fixes
- Fixed PCM audio format handling for all models
- Fixed history playback on Android
- Fixed audio recording bugs
- Applied code review fixes: null guards, memory leak prevention

## v2.2.0 (2026-05-11)

### New Features
- **Android App**: Full Capacitor-based Android app with local TTS, voice clone, voice design, batch processing
- **Auto-Update Banner**: Settings page shows update notification when new version is available on GitHub
- **In-App APK Download**: Android app downloads and installs updates directly

### Bug Fixes
- Fixed Android recording with custom native microphone plugin (replaced broken Capacitor microphone)
- Fixed API URL resolution on Android
- Fixed history playback on Android
- Fixed PCM audio format for MiMo TTS API

### Architecture
- Platform-aware API client (`isNative()` branching in `client.ts`)
- TypeScript MiMo API client for direct API calls on Android
- Capacitor SQLite database layer
- Capacitor Filesystem for audio storage

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
