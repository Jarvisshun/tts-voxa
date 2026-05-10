import { useState, useRef, useEffect } from 'react'
import { synthesizeTTS, getModels, getPresets, type TTSRequest } from '../api/client'

interface ModelItem {
  id: string
  name: string
  type: string
  provider?: string
}

interface VoiceItem {
  id: string
  name: string
  style: string
}

export default function TTSWorkbench() {
  const [text, setText] = useState('你好，欢迎使用 TTS Studio！这是一段测试文本。')
  const [voice, setVoice] = useState('mimo_default')
  const [model, setModel] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [emotion, setEmotion] = useState('')
  const [format, setFormat] = useState('wav')
  const [loading, setLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const [models, setModels] = useState<ModelItem[]>([])
  const [voices, setVoices] = useState<VoiceItem[]>([
    { id: 'mimo_default', name: '默认', style: '标准音色' },
  ])

  useEffect(() => {
    getModels().then(res => {
      if (res.success && res.data.length > 0) {
        setModels(res.data)
        if (!model) setModel(res.data[0].id)
      }
    }).catch(() => {})
    getPresets().then(res => {
      if (res.success) setVoices(res.data)
    }).catch(() => {})
  }, [])

  const handleSynthesize = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setAudioSrc('')

    try {
      const req: TTSRequest = {
        text: text.trim(),
        model,
        voice,
        format,
        speed,
        emotion: emotion || undefined,
      }
      const resp = await synthesizeTTS(req)
      if (resp.success && resp.data) {
        const audioUrl = `data:audio/${resp.data.format};base64,${resp.data.audio}`
        setAudioSrc(audioUrl)
      } else {
        setError(resp.error?.message || '合成失败')
      }
    } catch (e: any) {
      setError(e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.load()
    }
  }, [audioSrc])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Text Input */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">合成文本</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={8}
              maxLength={5000}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="输入要合成的文本..."
            />
            <div className="text-right text-xs text-slate-500 mt-1">{text.length}/5000</div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">模型</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                {models.length > 0 ? (
                  models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.provider ? ` (${m.provider})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">请先在设置中配置服务商</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">格式</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
                <option value="pcm">PCM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">语速: {speed.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">情感</label>
              <input
                type="text"
                value={emotion}
                onChange={e => setEmotion(e.target.value)}
                placeholder="如: 开心"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Voice Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">选择音色</label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {voices.map(v => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  voice === v.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="font-medium">{v.name}</div>
                <div className="text-xs opacity-70">{v.style}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSynthesize}
        disabled={loading || !text.trim() || !model}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors"
      >
        {loading ? '正在合成...' : '开始合成'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Audio Player */}
      {audioSrc && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">合成结果</div>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioSrc} />
          </audio>
          <a
            href={audioSrc}
            download={`tts_output.${format}`}
            className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            下载音频
          </a>
        </div>
      )}
    </div>
  )
}
