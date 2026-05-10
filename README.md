# TTS Voxa - AI Voice Studio

一站式语音创作平台，基于小米 MiMo TTS 系列模型构建。

A one-stop voice creation platform powered by Xiaomi MiMo TTS models.

[中文](#中文) | [English](#english)

---

## 中文

### 功能概览

| 模块 | 功能 | 使用模型 |
|------|------|----------|
| TTS 工作台 | 文本转语音，9种预设音色，语速/情感控制，流式输出 | mimo-v2.5-tts / mimo-v2-tts |
| 声音克隆 | 上传参考音频或**现场录音**克隆声音，支持情感叠加 | mimo-v2.5-tts-voiceclone |
| 声音设计 | 文字描述生成全新虚拟声音 | mimo-v2.5-tts-voicedesign |
| 批量处理 | 文档批量导入，统一音色导出，**后台持续运行** | mimo-v2.5-tts |
| 历史记录 | 查看所有生成记录，播放/下载历史音频 | - |
| 设置 | 多服务商 API 配置，版本更新检查 | - |

### 获取方式

#### 方式一：下载 Windows 可执行文件（推荐）

前往 [Releases](https://github.com/Jarvisshun/tts-voxa/releases) 页面下载最新版本的 `TTS-Voxa-vX.X.X.zip`，解压后运行 `TTS Voxa.exe` 即可。

- 无需安装 Python/Node.js 环境
- 数据保存在用户本地磁盘，关闭重启不丢失
- 应用内可检查版本更新

#### 方式二：本地化部署（开发者）

```bash
# 1. 克隆仓库
git clone https://github.com/Jarvisshun/tts-voxa.git
cd tts-voxa

# 2. 启动后端
cd backend
pip install -r requirements.txt
cp .env.sample .env
# 编辑 .env 填入你的 MIMO_API_KEY
python main.py

# 3. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173，后端默认端口 8000。

### 配置 API Key

**方式一（推荐）**：在应用「设置」页面中配置，密钥保存在本地数据库。

**方式二**：编辑 `backend/.env` 文件：

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

支持多服务商配置，可在设置页面添加 OpenAI 等第三方兼容 API。

### 预设音色

| 音色 | 风格 |
|------|------|
| mimo_default | 默认音色 |
| 冰糖 | 甜美女声 |
| 茉莉 | 温柔女声 |
| 苏打 | 活泼女声 |
| 白桦 | 沉稳男声 |
| Mia | 英文女声 |
| Chloe | 英文女声 |
| Milo | 英文男声 |
| Dean | 英文男声 |

### 数据存储

所有数据保存在用户本地磁盘，关闭重启不会丢失：

| 数据 | 位置 | 说明 |
|------|------|------|
| 数据库 | `backend/data.db` | 历史记录、批量任务、声音库、API 配置 |
| 音频文件 | `backend/audio_store/` | 所有生成的 WAV 文件 |
| 环境变量 | `backend/.env` | API 密钥（可选，也可通过页面配置） |

### v2.1 新功能

- **独立桌面应用**：exe 版本打开后直接显示应用窗口（基于 Edge WebView2），无需外部浏览器
- **版本更新检查**：设置页面可检查 GitHub 最新版本，显示更新日志和下载链接

### v2.0 功能

- **左侧侧边栏导航**：参考 ElevenLabs / Fish Audio 设计风格，左侧垂直导航 + 实时任务面板
- **麦克风录音**：声音克隆页面支持直接录音，可选电脑麦克风、外接麦克风、蓝牙/有线耳机，录音时实时波形可视化
- **批量任务持久化**：批量处理任务保存到数据库，切换页面不会丢失，后台持续运行
- **批量结果播放**：批量合成完成后可逐段播放/下载音频
- **波形播放器**：所有音频播放器升级为 WaveSurfer.js 波形可视化播放器
- **历史记录修复**：所有合成操作（TTS/克隆/设计/批量）均写入历史记录
- **任务面板**：侧边栏实时显示所有任务状态，支持跨页面追踪

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + TailwindCSS 4.3 + WaveSurfer.js |
| 后端 | Python 3.11+ FastAPI + aiosqlite |
| 存储 | SQLite（WAL 模式，支持并发） |
| 音频 | WaveSurfer.js 波形可视化 + MediaRecorder API 录音 |
| 打包 | PyInstaller + pywebview（原生窗口） |

### API 端点一览

<details>
<summary>点击展开完整 API 列表</summary>

#### TTS 合成
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tts/synthesize` | 文本转语音 |
| POST | `/api/tts/stream` | 流式文本转语音 (SSE) |

#### 声音克隆
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/clone/synthesize` | 克隆声音合成（multipart） |
| POST | `/api/clone/save` | 保存克隆声音到声音库 |

#### 声音设计
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/design/generate` | 文字描述生成声音 |

#### 批量处理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/batch/create` | 创建批量任务 |
| GET | `/api/batch/list` | 获取批量任务列表 |
| GET | `/api/batch/{job_id}/status` | 查询任务状态 |
| GET | `/api/batch/{job_id}/items/{index}/audio` | 获取单段音频 |

#### 声音库
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/voices` | 获取声音列表 |
| POST | `/api/voices` | 保存声音 |
| DELETE | `/api/voices/{voice_id}` | 删除声音 |
| GET | `/api/voices/presets` | 获取预设音色 |

#### 历史记录
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/history` | 分页获取历史记录 |
| GET | `/api/history/tasks` | 获取最近任务（侧边栏） |
| GET | `/api/history/{id}/audio` | 获取历史音频 |

#### 配置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config/providers` | 获取服务商列表 |
| POST | `/api/config/providers` | 添加服务商 |
| PUT | `/api/config/providers/{id}` | 更新服务商 |
| DELETE | `/api/config/providers/{id}` | 删除服务商 |
| GET | `/api/config/models` | 获取模型列表 |
| POST | `/api/config/test` | 测试连接 |

#### 系统
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/version` | 获取版本号 |
| GET | `/api/update/check` | 检查更新 |

</details>

### 项目结构

```
TTS/
├── README.md
├── CHANGELOG.md
├── docs/                      # 详细文档
│   ├── api.md                 # API 接口文档
│   ├── architecture.md        # 技术架构
│   ├── development.md         # 开发指南
│   └── testing.md             # 测试指南
├── backend/                   # Python FastAPI 后端
│   ├── main.py                # 入口 + 版本号 + 更新检查
│   ├── build.py               # PyInstaller 打包脚本
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/               # API 路由
│   │   ├── tts.py             # TTS 合成
│   │   ├── clone.py           # 声音克隆
│   │   ├── design.py          # 声音设计
│   │   ├── batch.py           # 批量处理
│   │   ├── voices.py          # 声音库管理
│   │   ├── history.py         # 历史记录
│   │   └── config.py          # 服务商配置
│   ├── services/              # MiMo TTS 客户端
│   │   └── mimo_client.py
│   ├── models/                # 数据库模型
│   │   ├── database.py        # SQLite 初始化 + 表结构
│   │   └── schemas.py         # Pydantic 数据模式
│   └── utils/                 # 工具函数
│       ├── config.py          # 环境变量配置
│       └── audio.py           # 音频格式处理
└── frontend/                  # React 前端
    └── src/
        ├── App.tsx            # 主布局（侧边栏 + 内容区）
        ├── api/
        │   └── client.ts      # API 客户端函数
        ├── components/        # 共享组件
        │   ├── Sidebar.tsx    # 侧边栏导航 + 任务面板
        │   ├── WaveformPlayer.tsx  # 波形播放器
        │   └── AudioRecorder.tsx   # 麦克风录音
        ├── contexts/
        │   └── TaskContext.tsx # 全局任务状态管理
        ├── pages/             # 页面组件
        │   ├── TTSWorkbench.tsx
        │   ├── VoiceClone.tsx
        │   ├── VoiceDesign.tsx
        │   ├── BatchProcess.tsx
        │   ├── History.tsx
        │   └── Settings.tsx
        └── utils/
            └── audio.ts       # WebM 转 WAV 工具
```

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend (React + TypeScript)             │
│  ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────────────┐  │
│  │TTS 工作台│ │声音克隆 │ │声音设计 │ │批量 / 历史 / 设置│  │
│  └────┬────┘ └───┬────┘ └───┬────┘ └───────┬─────────┘  │
│       └──────────┴──────────┴──────────────┘             │
│                         │ HTTP / SSE                     │
└─────────────────────────┼────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────┐
│                 Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  API Router: /tts /clone /design /batch /voices   │    │
│  │              /history /config /version /update     │    │
│  └──────────────────────┬───────────────────────────┘    │
│  ┌──────────────────────┴───────────────────────────┐    │
│  │  MiMo TTS Client (httpx, streaming, retry)       │    │
│  └──────────────────────┬───────────────────────────┘    │
│  ┌──────────────────────┴───────────────────────────┐    │
│  │  SQLite (WAL mode)                                │    │
│  │  voices / generations / batch_jobs / providers    │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴────────────────────────────────┐
│           Xiaomi MiMo TTS API (Singapore)                 │
│  mimo-v2.5-tts / mimo-v2-tts                             │
│  mimo-v2.5-tts-voiceclone / mimo-v2.5-tts-voicedesign    │
└──────────────────────────────────────────────────────────┘
```

---

## English

### Features

| Module | Description | Model |
|--------|-------------|-------|
| TTS Workbench | Text-to-speech with 9 preset voices, speed/emotion control, streaming | mimo-v2.5-tts / mimo-v2-tts |
| Voice Clone | Clone voice from reference audio or **live recording**, emotion overlay | mimo-v2.5-tts-voiceclone |
| Voice Design | Generate new virtual voices from text description | mimo-v2.5-tts-voicedesign |
| Batch Process | Bulk import, unified voice export, **runs in background** | mimo-v2.5-tts |
| History | View all generation records, play/download audio | - |
| Settings | Multi-provider API configuration, version update check | - |

### Getting Started

#### Option 1: Download Windows Executable (Recommended)

Go to the [Releases](https://github.com/Jarvisshun/tts-voxa/releases) page and download the latest `TTS-Voxa-vX.X.X.zip`. Extract and run `TTS Voxa.exe`.

- No Python/Node.js installation required
- All data stored locally, persists across restarts
- In-app version update checking

#### Option 2: Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Jarvisshun/tts-voxa.git
cd tts-voxa

# 2. Start the backend
cd backend
pip install -r requirements.txt
cp .env.sample .env
# Edit .env and fill in your MIMO_API_KEY
python main.py

# 3. Start the frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173, backend defaults to port 8000.

### Configure API Key

**Option 1 (Recommended)**: Configure in the Settings page. Keys are stored in the local database.

**Option 2**: Edit `backend/.env`:

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

Supports multi-provider configuration. Add OpenAI-compatible APIs via the Settings page.

### Preset Voices

| Voice | Style |
|-------|-------|
| mimo_default | Default voice |
| 冰糖 (Bingtang) | Sweet female |
| 茉莉 (Jasmine) | Gentle female |
| 苏打 (Soda) | Lively female |
| 白桦 (Birch) | Steady male |
| Mia | English female |
| Chloe | English female |
| Milo | English male |
| Dean | English male |

### Data Storage

All data is stored locally and persists across restarts:

| Data | Location | Description |
|------|----------|-------------|
| Database | `backend/data.db` | History, batch tasks, voice library, API config |
| Audio files | `backend/audio_store/` | All generated WAV files |
| Environment | `backend/.env` | API key (optional, can configure via UI) |

### What's New in v2.1

- **Standalone Desktop App**: Exe opens in a native OS window (Edge WebView2), no external browser needed
- **Version Update Check**: Settings page checks GitHub for latest version with changelog and download link

### What's New in v2.0

- **Sidebar Navigation**: ElevenLabs / Fish Audio inspired layout with vertical nav + live task panel
- **Microphone Recording**: Record reference audio directly in Voice Clone page with real-time waveform visualization
- **Persistent Batch Tasks**: Batch jobs saved to database, survive page switches, run in background
- **Batch Result Playback**: Play/download individual audio segments after batch completion
- **Waveform Player**: All audio players upgraded to WaveSurfer.js waveform visualization
- **History Fix**: All synthesis operations (TTS/Clone/Design/Batch) now recorded in history
- **Task Panel**: Real-time task status in sidebar, cross-page tracking

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 + TailwindCSS 4.3 + WaveSurfer.js |
| Backend | Python 3.11+ FastAPI + aiosqlite |
| Storage | SQLite (WAL mode, concurrent access) |
| Audio | WaveSurfer.js waveform + MediaRecorder API |
| Packaging | PyInstaller + pywebview (native window) |

### API Endpoints

<details>
<summary>Click to expand full API list</summary>

#### TTS Synthesis
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tts/synthesize` | Text-to-speech |
| POST | `/api/tts/stream` | Streaming TTS (SSE) |

#### Voice Clone
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clone/synthesize` | Clone voice synthesis (multipart) |
| POST | `/api/clone/save` | Save cloned voice to library |

#### Voice Design
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/design/generate` | Generate voice from description |

#### Batch Processing
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/batch/create` | Create batch job |
| GET | `/api/batch/list` | List batch jobs |
| GET | `/api/batch/{job_id}/status` | Query job status |
| GET | `/api/batch/{job_id}/items/{index}/audio` | Get segment audio |

#### Voice Library
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/voices` | List voices |
| POST | `/api/voices` | Save voice |
| DELETE | `/api/voices/{voice_id}` | Delete voice |
| GET | `/api/voices/presets` | Get preset voices |

#### History
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/history` | Paginated history |
| GET | `/api/history/tasks` | Recent tasks (sidebar) |
| GET | `/api/history/{id}/audio` | Get history audio |

#### Configuration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config/providers` | List providers |
| POST | `/api/config/providers` | Add provider |
| PUT | `/api/config/providers/{id}` | Update provider |
| DELETE | `/api/config/providers/{id}` | Delete provider |
| GET | `/api/config/models` | List models |
| POST | `/api/config/test` | Test connection |

#### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/version` | Get version |
| GET | `/api/update/check` | Check for updates |

</details>

### Project Structure

```
TTS/
├── README.md
├── CHANGELOG.md
├── docs/                      # Documentation
│   ├── api.md                 # API reference
│   ├── architecture.md        # Architecture overview
│   ├── development.md         # Development guide
│   └── testing.md             # Testing guide
├── backend/                   # Python FastAPI Backend
│   ├── main.py                # Entry point + version + update check
│   ├── build.py               # PyInstaller build script
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/               # API routes
│   │   ├── tts.py             # TTS synthesis
│   │   ├── clone.py           # Voice cloning
│   │   ├── design.py          # Voice design
│   │   ├── batch.py           # Batch processing
│   │   ├── voices.py          # Voice library
│   │   ├── history.py         # Generation history
│   │   └── config.py          # Provider config
│   ├── services/              # MiMo TTS client
│   │   └── mimo_client.py
│   ├── models/                # Database models
│   │   ├── database.py        # SQLite init + schema
│   │   └── schemas.py         # Pydantic schemas
│   └── utils/
│       ├── config.py          # Environment config
│       └── audio.py           # Audio format utilities
└── frontend/                  # React Frontend
    └── src/
        ├── App.tsx            # Main layout (sidebar + content)
        ├── api/
        │   └── client.ts      # API client functions
        ├── components/
        │   ├── Sidebar.tsx    # Navigation + task panel
        │   ├── WaveformPlayer.tsx  # WaveSurfer.js player
        │   └── AudioRecorder.tsx   # Microphone recorder
        ├── contexts/
        │   └── TaskContext.tsx # Global task state
        ├── pages/
        │   ├── TTSWorkbench.tsx
        │   ├── VoiceClone.tsx
        │   ├── VoiceDesign.tsx
        │   ├── BatchProcess.tsx
        │   ├── History.tsx
        │   └── Settings.tsx
        └── utils/
            └── audio.ts       # WebM to WAV conversion
```

---

## License

MIT
