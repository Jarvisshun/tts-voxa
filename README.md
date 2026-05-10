# TTS Voxa - AI Voice Studio

一站式语音创作平台，基于小米 MiMo TTS 系列模型构建。

A one-stop voice creation platform powered by Xiaomi MiMo TTS models.

[中文](#中文) | [English](#english)

---

## 中文

### 功能概览

| 模块 | 功能 | 使用模型 |
|------|------|----------|
| TTS 工作台 | 文本转语音，9种预设音色，语速/情感控制 | mimo-v2.5-tts / mimo-v2-tts |
| 声音克隆 | 上传参考音频或**现场录音**克隆声音，支持情感叠加 | mimo-v2.5-tts-voiceclone |
| 声音设计 | 文字描述生成全新虚拟声音 | mimo-v2.5-tts-voicedesign |
| 批量处理 | 文档批量导入，统一音色导出，**后台持续运行** | mimo-v2.5-tts |
| 历史记录 | 查看所有生成记录，播放/下载历史音频 | - |
| 设置 | 多服务商 API 配置，支持自定义模型 | - |

### v2.0 新功能

- **左侧侧边栏导航**: 参考 ElevenLabs / Fish Audio 设计风格，左侧垂直导航 + 实时任务面板
- **麦克风录音**: 声音克隆页面支持直接录音，可选电脑麦克风、外接麦克风、蓝牙/有线耳机，录音时实时波形可视化
- **批量任务持久化**: 批量处理任务保存到数据库，切换页面不会丢失，后台持续运行
- **批量结果播放**: 批量合成完成后可逐段播放/下载音频
- **波形播放器**: 所有音频播放器升级为 WaveSurfer.js 波形可视化播放器
- **历史记录修复**: 所有合成操作（TTS/克隆/设计/批量）均写入历史记录
- **任务面板**: 侧边栏实时显示所有任务状态，支持跨页面追踪

### 技术栈

- **前端**: React 19 + TypeScript + Vite 8 + TailwindCSS 4.3 + WaveSurfer.js
- **后端**: Python 3.11+ FastAPI + aiosqlite
- **存储**: SQLite（历史记录、批量任务、声音库、API 配置）
- **音频**: WaveSurfer.js 波形可视化 + MediaRecorder API 录音

### 快速开始

#### 1. 克隆仓库

```bash
git clone https://github.com/Jarvisshun/mimo-tts-studio.git
cd mimo-tts-studio
```

#### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
cp .env.sample .env
# 编辑 .env 填入你的 MIMO_API_KEY
python main.py
```

后端自动选择可用端口（默认 8000）

#### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

#### 4. 配置 API Key

方式一：编辑 `backend/.env`

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

方式二：在页面"设置"中配置（推荐，密钥保存在本地数据库）

### 数据存储

所有数据保存在用户本地磁盘，关闭重启不会丢失：

| 数据 | 位置 | 说明 |
|------|------|------|
| 数据库 | `backend/data.db` | 历史记录、批量任务、声音库、API 配置 |
| 音频文件 | `backend/audio_store/` | 所有生成的 WAV 文件 |
| 环境变量 | `backend/.env` | API 密钥（可选，也可通过页面配置） |

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

### 项目结构

```
TTS/
├── README.md
├── backend/                 # Python FastAPI 后端
│   ├── main.py              # 入口
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/             # API 路由 (tts, clone, design, batch, voices, history, config)
│   ├── services/            # MiMo TTS 客户端
│   ├── models/              # 数据库模型 + Pydantic 模式
│   └── utils/               # 音频工具 + 配置
└── frontend/                # React 前端
    └── src/
        ├── App.tsx           # 主布局 (侧边栏 + 内容)
        ├── api/client.ts     # API 客户端
        ├── components/       # 共享组件 (Sidebar, WaveformPlayer, AudioRecorder)
        ├── contexts/         # React Context (TaskContext)
        ├── pages/            # 页面组件
        └── utils/            # 工具函数
```

---

## English

### Features

| Module | Description | Model |
|--------|-------------|-------|
| TTS Workbench | Text-to-speech with 9 preset voices, speed/emotion control | mimo-v2.5-tts / mimo-v2-tts |
| Voice Clone | Clone voice from reference audio or **live recording**, emotion overlay | mimo-v2.5-tts-voiceclone |
| Voice Design | Generate new virtual voices from text description | mimo-v2.5-tts-voicedesign |
| Batch Process | Bulk import, unified voice export, **runs in background** | mimo-v2.5-tts |
| History | View all generation records, play/download audio | - |
| Settings | Multi-provider API configuration with custom models | - |

### What's New in v2.0

- **Sidebar Navigation**: ElevenLabs / Fish Audio inspired layout with vertical nav + live task panel
- **Microphone Recording**: Record reference audio directly in Voice Clone page with real-time waveform visualization
- **Persistent Batch Tasks**: Batch jobs saved to database, survive page switches, run in background
- **Batch Result Playback**: Play/download individual audio segments after batch completion
- **Waveform Player**: All audio players upgraded to WaveSurfer.js waveform visualization
- **History Fix**: All synthesis operations (TTS/Clone/Design/Batch) now recorded in history
- **Task Panel**: Real-time task status in sidebar, cross-page tracking

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8 + TailwindCSS 4.3 + WaveSurfer.js
- **Backend**: Python 3.11+ FastAPI + aiosqlite
- **Storage**: SQLite (history, batch tasks, voice library, API config)
- **Audio**: WaveSurfer.js waveform + MediaRecorder API recording

### Quick Start

#### 1. Clone the repository

```bash
git clone https://github.com/Jarvisshun/mimo-tts-studio.git
cd mimo-tts-studio
```

#### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
cp .env.sample .env
# Edit .env and fill in your MIMO_API_KEY
python main.py
```

Backend auto-selects an available port (default 8000)

#### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

#### 4. Configure API Key

Option 1: Edit `backend/.env`

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

Option 2: Configure in the Settings page (recommended, key stored in local database)

### Data Storage

All data is stored locally on the user's machine and persists across restarts:

| Data | Location | Description |
|------|----------|-------------|
| Database | `backend/data.db` | History, batch tasks, voice library, API config |
| Audio files | `backend/audio_store/` | All generated WAV files |
| Environment | `backend/.env` | API key (optional, can configure via UI) |

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

### Project Structure

```
TTS/
├── README.md
├── backend/                 # Python FastAPI Backend
│   ├── main.py              # Entry point
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/             # API routes (tts, clone, design, batch, voices, history, config)
│   ├── services/            # MiMo TTS client
│   ├── models/              # Database models + Pydantic schemas
│   └── utils/               # Audio utilities + config
└── frontend/                # React Frontend
    └── src/
        ├── App.tsx           # Main layout (sidebar + content)
        ├── api/client.ts     # API client
        ├── components/       # Shared components (Sidebar, WaveformPlayer, AudioRecorder)
        ├── contexts/         # React Context (TaskContext)
        ├── pages/            # Page components
        └── utils/            # Utilities
```

---

## License

MIT
