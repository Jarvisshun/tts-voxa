# MiMo TTS Studio

一站式语音创作平台，基于小米 MiMo TTS 系列模型构建。

A one-stop voice creation platform powered by Xiaomi MiMo TTS models.

[中文](#中文) | [English](#english)

---

## 中文

### 功能概览

| 模块 | 功能 | 使用模型 |
|------|------|----------|
| 快速 TTS | 文本转语音，9种预设音色，语速/情感控制 | mimo-v2.5-tts / mimo-v2-tts |
| 声音克隆 | 上传参考音频克隆声音，支持情感叠加 | mimo-v2.5-tts-voiceclone |
| 声音设计 | 文字描述生成全新虚拟声音 | mimo-v2.5-tts-voicedesign |
| 批量处理 | 文档批量导入，统一音色导出 | mimo-v2.5-tts |

### 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **后端**: Python 3.11+ FastAPI
- **音频**: WaveSurfer.js (波形可视化)
- **存储**: SQLite (声音库和历史记录)

### 快速开始

#### 1. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/mimo-tts-studio.git
cd mimo-tts-studio
```

#### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
# 配置 API Key
cp .env.sample .env
# 编辑 .env 填入你的 MIMO_API_KEY
python main.py
```

后端运行在 http://localhost:8000

#### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

#### 4. 配置 API Key

在 `backend/.env` 中配置:

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

API Key 获取方式: 订阅小米 MiMo 月度套餐后在控制台获取。

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

### 支持格式

- 输出: WAV, MP3, PCM, PCM16
- 流式: SSE 流式输出支持

### 项目结构

```
TTS/
├── README.md
├── docs/                    # 项目文档
│   ├── architecture.md      # 技术架构
│   ├── api.md               # API 文档
│   ├── development.md       # 开发指南
│   └── testing.md           # 测试计划
├── backend/                 # Python FastAPI 后端
│   ├── main.py              # 入口
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/             # API 路由
│   ├── services/            # 业务逻辑
│   ├── models/              # 数据模型
│   └── utils/               # 工具函数
└── frontend/                # React 前端
    ├── src/
    ├── package.json
    └── vite.config.ts
```

---

## English

### Features

| Module | Description | Model |
|--------|-------------|-------|
| Quick TTS | Text-to-speech with 9 preset voices, speed/emotion control | mimo-v2.5-tts / mimo-v2-tts |
| Voice Clone | Clone voice from reference audio, emotion overlay | mimo-v2.5-tts-voiceclone |
| Voice Design | Generate new virtual voices from text description | mimo-v2.5-tts-voicedesign |
| Batch Process | Bulk import, unified voice export | mimo-v2.5-tts |

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Python 3.11+ FastAPI
- **Audio**: WaveSurfer.js (waveform visualization)
- **Storage**: SQLite (voice library & history)

### Quick Start

#### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mimo-tts-studio.git
cd mimo-tts-studio
```

#### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
# Configure API Key
cp .env.sample .env
# Edit .env and fill in your MIMO_API_KEY
python main.py
```

Backend runs at http://localhost:8000

#### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

#### 4. Configure API Key

In `backend/.env`:

```
MIMO_API_KEY=your_api_key_here
MIMO_API_BASE=https://token-plan-sgp.xiaomimimo.com/v1
```

Get your API Key from the Xiaomi MiMo console after subscribing to a monthly plan.

### Preset Voices

| Voice | Style |
|-------|-------|
| mimo_default | Default voice |
| 冰糖 (Bingtang) | Sweet female |
| 茉莉 (Jasmine) | Gentle female |
| 苏打 (Soda) | lively female |
| 白桦 (Birch) | Steady male |
| Mia | English female |
| Chloe | English female |
| Milo | English male |
| Dean | English male |

### Supported Formats

- Output: WAV, MP3, PCM, PCM16
- Streaming: SSE streaming support

### Project Structure

```
TTS/
├── README.md
├── docs/                    # Documentation
│   ├── architecture.md      # Architecture
│   ├── api.md               # API Reference
│   ├── development.md       # Development Guide
│   └── testing.md           # Test Plan
├── backend/                 # Python FastAPI Backend
│   ├── main.py              # Entry point
│   ├── requirements.txt
│   ├── .env.sample
│   ├── routers/             # API routes
│   ├── services/            # Business logic
│   ├── models/              # Data models
│   └── utils/               # Utilities
└── frontend/                # React Frontend
    ├── src/
    ├── package.json
    └── vite.config.ts
```

---

## License

MIT
