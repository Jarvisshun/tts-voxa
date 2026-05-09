# API 文档

## Base URL

```
http://localhost:8000/api
```

## 1. TTS 基础转语音

### POST /api/tts/synthesize

文本转语音。

**请求体:**
```json
{
  "text": "今天天气真好！",
  "model": "mimo-v2.5-tts",
  "voice": "Mia",
  "format": "wav",
  "speed": 1.0,
  "emotion": "开心"
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| text | string | 是 | - | 要合成的文本，最长5000字符 |
| model | string | 否 | mimo-v2.5-tts | 模型选择 |
| voice | string | 否 | mimo_default | 音色名称 |
| format | string | 否 | wav | 输出格式: wav/mp3/pcm/pcm16 |
| speed | float | 否 | 1.0 | 语速: 0.5-2.0 |
| emotion | string | 否 | - | 情感风格描述 |

**响应:**
```json
{
  "success": true,
  "data": {
    "audio": "<base64-encoded-audio>",
    "format": "wav",
    "generation_id": "gen_xxx"
  }
}
```

### POST /api/tts/stream

流式文本转语音 (SSE)。

**请求体:** 同 `/api/tts/synthesize`

**响应:** SSE 事件流
```
data: {"type": "audio_chunk", "data": "<base64-chunk>"}
data: {"type": "audio_chunk", "data": "<base64-chunk>"}
data: {"type": "complete", "generation_id": "gen_xxx"}
```

## 2. 声音克隆

### POST /api/clone/synthesize

使用克隆声音合成语音。

**请求:** multipart/form-data

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| audio | file | 是 | 参考音频文件 (wav/mp3) |
| text | string | 是 | 要合成的文本 |
| format | string | 否 | 输出格式，默认 wav |
| emotion | string | 否 | 情感风格 |

**响应:**
```json
{
  "success": true,
  "data": {
    "audio": "<base64-encoded-audio>",
    "format": "wav",
    "voice_id": "voice_xxx",
    "generation_id": "gen_xxx"
  }
}
```

### POST /api/clone/save

保存克隆声音到声音库。

**请求:** multipart/form-data

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| audio | file | 是 | 参考音频文件 |
| name | string | 是 | 声音名称 |

**响应:**
```json
{
  "success": true,
  "data": {
    "voice_id": "voice_xxx",
    "name": "我的声音"
  }
}
```

## 3. 声音设计

### POST /api/design/generate

根据文字描述生成声音并合成语音。

**请求体:**
```json
{
  "description": "温柔的女声，带点烟嗓，语速稍快",
  "text": "你好，欢迎使用 MiMo TTS Studio",
  "format": "wav"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| description | string | 是 | 声音特征描述 |
| text | string | 是 | 要合成的文本 |
| format | string | 否 | 输出格式，默认 wav |

**响应:**
```json
{
  "success": true,
  "data": {
    "audio": "<base64-encoded-audio>",
    "format": "wav",
    "generation_id": "gen_xxx"
  }
}
```

## 4. 批量处理

### POST /api/batch/create

创建批量任务。

**请求体:**
```json
{
  "name": "有声书第一章",
  "texts": ["段落1", "段落2", "段落3"],
  "voice": "茉莉",
  "model": "mimo-v2.5-tts",
  "format": "wav",
  "speed": 1.0
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xxx",
    "total_items": 3
  }
}
```

### GET /api/batch/{job_id}/status

查询批量任务状态。

**响应:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xxx",
    "status": "running",
    "total_items": 10,
    "completed_items": 5,
    "results": [
      {"index": 0, "audio_path": "...", "status": "completed"},
      {"index": 1, "audio_path": "...", "status": "completed"}
    ]
  }
}
```

## 5. 声音库管理

### GET /api/voices

获取声音列表。

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "voice_xxx",
      "name": "我的声音",
      "type": "clone",
      "created_at": "2026-05-10T12:00:00"
    }
  ]
}
```

### DELETE /api/voices/{voice_id}

删除声音。

## 6. 历史记录

### GET /api/history

获取生成历史。

**查询参数:**
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20

### GET /api/history/{generation_id}/audio

获取历史记录的音频文件。

## 7. 公共接口

### GET /api/models

获取可用模型列表。

### GET /api/voices/presets

获取预设音色列表。

## 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "文本长度超过限制"
  }
}
```

| 错误码 | 说明 |
|--------|------|
| INVALID_INPUT | 输入参数无效 |
| API_ERROR | 调用 MiMo API 失败 |
| FILE_TOO_LARGE | 上传文件过大 |
| RATE_LIMITED | 请求频率过高 |
| INTERNAL_ERROR | 服务器内部错误 |
