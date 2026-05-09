# 测试计划

## 测试策略

### 单元测试
- 后端: pytest
- 前端: Vitest

### 集成测试
- API 端点测试
- MiMo API 实际调用测试

### E2E 测试
- 核心用户流程验证

## 后端测试

### 1. MiMo API Client 测试

```python
# test_mimo_client.py
def test_basic_tts_request():
    """验证基础 TTS 请求格式正确"""

def test_tts_with_emotion():
    """验证情感控制请求格式"""

def test_voiceclone_dataurl_format():
    """验证 VoiceClone DataURL 转换"""

def test_voicedesign_request_format():
    """验证 VoiceDesign 请求格式"""

def test_streaming_response():
    """验证流式响应解析"""

def test_error_handling():
    """验证 API 错误处理"""
```

### 2. TTS Service 测试

```python
# test_tts_service.py
def test_synthesize_basic():
    """基础文本转语音"""

def test_synthesize_with_emotion():
    """带情感的文本转语音"""

def test_synthesize_with_speed():
    """自定义语速"""

def test_text_length_limit():
    """文本长度超限处理"""

def test_invalid_voice():
    """无效音色处理"""
```

### 3. Clone Service 测试

```python
# test_clone_service.py
def test_upload_audio():
    """上传参考音频"""

def test_audio_to_dataurl():
    """音频转 DataURL"""

def test_clone_with_emotion():
    """克隆声音叠加情感"""

def test_save_to_voice_library():
    """保存到声音库"""

def test_invalid_audio_format():
    """无效音频格式处理"""
```

### 4. Design Service 测试

```python
# test_design_service.py
def test_generate_voice_from_description():
    """文字描述生成声音"""

def test_synthesize_with_designed_voice():
    """用设计的声音合成语音"""
```

### 5. Batch Service 测试

```python
# test_batch_service.py
def test_create_batch_job():
    """创建批量任务"""

def test_batch_progress_tracking():
    """批量进度追踪"""

def test_batch_error_handling():
    """批量任务错误处理"""
```

## 前端测试

### 1. 组件测试

```typescript
// AudioPlayer.test.tsx
describe('AudioPlayer', () => {
  it('renders waveform correctly')
  it('plays audio on click')
  it('pauses audio')
  it('shows playback progress')
})

// VoiceSelector.test.tsx
describe('VoiceSelector', () => {
  it('displays all 9 preset voices')
  it('selects a voice')
  it('filters voices by search')
})
```

### 2. API 客户端测试

```typescript
// client.test.ts
describe('API Client', () => {
  it('sends TTS request correctly')
  it('handles streaming response')
  it('handles API errors')
  it('uploads audio file for clone')
})
```

## 集成测试

### 端到端流程测试

```python
# test_e2e.py
def test_full_tts_flow():
    """完整 TTS 流程: 输入文本 -> 选择音色 -> 生成 -> 播放"""

def test_full_clone_flow():
    """完整克隆流程: 上传音频 -> 克隆 -> 保存 -> 使用"""

def test_full_design_flow():
    """完整设计流程: 描述声音 -> 生成 -> 保存 -> 使用"""

def test_full_batch_flow():
    """完整批量流程: 导入文本 -> 配置 -> 批量生成 -> 导出"""
```

## 实际 API 测试

使用真实 MiMo API Key 进行测试:

```python
# test_api_integration.py
@pytest.mark.integration
def test_real_tts_api():
    """调用真实 MiMo TTS API"""

@pytest.mark.integration
def test_real_clone_api():
    """调用真实 VoiceClone API"""

@pytest.mark.integration
def test_real_design_api():
    """调用真实 VoiceDesign API"""

@pytest.mark.integration
def test_streaming_api():
    """测试流式 API"""
```

## 性能测试

- 单次 TTS 响应时间 < 5s
- 流式首字节时间 < 1s
- 批量任务并发数: 3
- 文件上传大小限制: 10MB

## 测试运行

```bash
# 后端测试
cd backend
pytest tests/ -v

# 前端测试
cd frontend
npm run test

# 集成测试 (需要 API Key)
cd backend
pytest tests/ -v -m integration
```
