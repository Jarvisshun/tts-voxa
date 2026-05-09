# 技术架构

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ TTS工作台 │ │ 声音克隆  │ │ 声音设计  │ │  批量处理     │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       └─────────────┴────────────┴──────────────┘           │
│                          │ HTTP/SSE                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   API Router                         │   │
│  │  /api/tts/*  /api/clone/*  /api/design/*  /api/batch │   │
│  └──────────────────────┬───────────────────────────────┘   │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                TTS Service Layer                     │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │ BasicTTS│ │VoiceClone│ │VoiceDesign│ │ BatchTTS│  │   │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬────┘  │   │
│  └───────┴───────────┴────────────┴─────────────┴───────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MiMo API Client                         │   │
│  │  - 请求构建  - 流式处理  - 响应解析  - 错误重试       │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │              Storage Layer (SQLite)                   │   │
│  │  - 声音库  - 生成历史  - 批量任务  - 用户配置          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┴────────────────────────────────────┐
│               Xiaomi MiMo TTS API                            │
│  mimo-v2.5-tts / mimo-v2.5-tts-voiceclone                   │
│  mimo-v2.5-tts-voicedesign / mimo-v2-tts                    │
└──────────────────────────────────────────────────────────────┘
```

## 核心模块

### 1. TTS Service

负责基础文本转语音，支持：
- 9 种预设音色选择
- 语速控制 (0.5x - 2.0x)
- 情感风格控制 (通过 user message)
- 流式输出 (SSE)
- 多格式输出 (wav, mp3, pcm)

### 2. VoiceClone Service

负责声音克隆，支持：
- 上传参考音频 (wav/mp3)
- 自动转换为 DataURL 格式
- 叠加情感控制 (克隆声音 + 情感指定)
- 声音库管理 (保存/删除/查询克隆声音)

### 3. VoiceDesign Service

负责文字描述生成声音，支持：
- 自然语言描述声音特征
- 生成结果可保存到声音库
- 可作为克隆素材使用

### 4. Batch Service

负责批量处理，支持：
- 文本文件批量导入
- 按段落/句子分割
- 统一音色批量生成
- 任务队列管理
- 进度追踪

## 数据库设计

### voices 表 (声音库)
```sql
CREATE TABLE voices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'preset' | 'clone' | 'design'
    voice_id TEXT,                -- 预设音色ID 或 克隆音频路径
    description TEXT,             -- 声音描述 (VoiceDesign)
    audio_path TEXT,              -- 克隆参考音频路径
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### generations 表 (生成历史)
```sql
CREATE TABLE generations (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice TEXT,
    text_content TEXT NOT NULL,
    audio_path TEXT NOT NULL,
    format TEXT DEFAULT 'wav',
    speed REAL DEFAULT 1.0,
    emotion TEXT,
    duration REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### batch_jobs 表 (批量任务)
```sql
CREATE TABLE batch_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending/running/completed/failed
    total_items INTEGER,
    completed_items INTEGER DEFAULT 0,
    voice TEXT,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
```

## API 兼容性

后端对外暴露 RESTful API，格式与小米 MiMo API 兼容，方便后续扩展：
- 所有响应统一为 JSON 格式
- 流式端点使用 SSE (Server-Sent Events)
- 错误响应包含明确的错误码和消息

## 安全考虑

- API Key 仅存储在后端 .env 文件中，不暴露给前端
- 上传音频文件大小限制 (10MB)
- 生成请求频率限制
- 输入文本长度限制 (5000字符)
