# 开发指南

## 环境要求

- Python 3.11+
- Node.js 18+
- npm 9+

## 后端开发

### 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 运行开发服务器

```bash
python main.py
```

热重载默认开启，修改代码自动重启。

### 项目结构

```
backend/
├── main.py              # FastAPI 入口
├── requirements.txt     # Python 依赖
├── .env                 # 环境变量 (API Key)
├── routers/
│   ├── tts.py           # /api/tts 路由
│   ├── clone.py         # /api/clone 路由
│   ├── design.py        # /api/design 路由
│   ├── batch.py         # /api/batch 路由
│   ├── voices.py        # /api/voices 路由
│   └── history.py       # /api/history 路由
├── services/
│   ├── mimo_client.py   # MiMo API 客户端
│   ├── tts_service.py   # TTS 业务逻辑
│   ├── clone_service.py # 声音克隆逻辑
│   ├── design_service.py# 声音设计逻辑
│   └── batch_service.py # 批量处理逻辑
├── models/
│   ├── database.py      # SQLite 数据库
│   └── schemas.py       # Pydantic 数据模型
└── utils/
    ├── audio.py         # 音频处理工具
    └── config.py        # 配置管理
```

## 前端开发

### 安装依赖

```bash
cd frontend
npm install
```

### 运行开发服务器

```bash
npm run dev
```

### 项目结构

```
frontend/
├── src/
│   ├── main.tsx         # 入口
│   ├── App.tsx          # 主应用
│   ├── api/
│   │   └── client.ts    # API 客户端
│   ├── components/
│   │   ├── Layout.tsx       # 布局组件
│   │   ├── AudioPlayer.tsx  # 音频播放器 (WaveSurfer.js)
│   │   ├── VoiceSelector.tsx# 音色选择器
│   │   ├── SpeedControl.tsx # 语速控制
│   │   └── EmotionInput.tsx # 情感输入
│   ├── pages/
│   │   ├── TTSWorkbench.tsx  # TTS 工作台
│   │   ├── VoiceClone.tsx    # 声音克隆
│   │   ├── VoiceDesign.tsx   # 声音设计
│   │   ├── BatchProcess.tsx  # 批量处理
│   │   └── History.tsx       # 历史记录
│   └── styles/
│       └── globals.css   # 全局样式
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## MiMo TTS API 调用规范

### 基础 TTS 请求格式

```python
{
    "model": "mimo-v2.5-tts",
    "messages": [
        {"role": "user", "content": "用开心的语气说"},      # 可选：情感/风格
        {"role": "assistant", "content": "要合成的文本"}    # 必填：合成文本
    ],
    "modalities": ["text", "audio"],
    "audio": {
        "voice": "Mia",      # 音色名称
        "format": "wav",     # 输出格式
        "speed": 1.0         # 语速
    },
    "stream": false           # 是否流式
}
```

### 关键规则

1. **assistant message 必填** — 放置要合成的文本
2. **system message 不可用** — 不要在 messages 中使用 system role
3. **user message 可选** — 用于指定情感/风格
4. **VoiceClone 的 voice 字段** — 必须是 DataURL 格式: `data:audio/wav;base64,<base64>`
5. **VoiceDesign** — 声音描述放在 user message，audio.voice 参数不生效

### 响应解析

```python
response_data = response.json()
audio_base64 = response_data["choices"][0]["message"]["audio"]["data"]
```

## 开发规范

- 后端 Python 代码遵循 PEP 8
- 前端 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- API 响应统一使用 `{success, data/error}` 格式
- 音频文件存储在 `backend/audio_store/` 目录
