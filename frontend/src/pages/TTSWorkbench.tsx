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
    }).catch(() => {
      setError('无法加载模型列表，请在设置中配置服务商')
    })
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

  const speedPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  return (
    <div className="space-y-5">
      {/* Top: Text + Voice side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Text Input */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
            <label className="block text-sm font-medium text-slate-300 mb-3">合成文本</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
              maxLength={5000}
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-slate-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none resize-none text-sm leading-relaxed transition-all"
              placeholder="输入要合成的文本..."
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] text-slate-600">支持中英文混合</span>
              <span className="text-[11px] text-slate-600">{text.length}/5000</span>
            </div>
          </div>
        </div>

        {/* Voice Selector */}
        <div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm h-full">
            <label className="block text-sm font-medium text-slate-300 mb-3">选择音色</label>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {voices.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    voice === v.id
                      ? 'bg-gradient-to-r from-blue-600/90 to-blue-600/70 text-white shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  <div className="font-medium truncate">{v.name}</div>
                  <div className={`text-[11px] mt-0.5 truncate ${voice === v.id ? 'text-blue-100/70' : 'text-slate-600'}`}>
                    {v.style}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Model */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">模型</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none truncate"
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

          {/* Format */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">输出格式</label>
            <div className="flex gap-1">
              {['wav', 'mp3', 'pcm'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-blue-600/80 text-white shadow-sm'
                      : 'bg-slate-900/50 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              语速 <span className="text-blue-400 normal-case">{speed.toFixed(1)}x</span>
            </label>
            <div className="flex gap-1">
              {speedPresets.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    Math.abs(speed - s) < 0.01
                      ? 'bg-blue-600/80 text-white'
                      : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">情感</label>
            <input
              type="text"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="如: 开心、温柔"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSynthesize}
        disabled={loading || !text.trim() || !model}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            正在合成...
          </span>
        ) : '开始合成'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <span className="text-lg">!</span>
          {error}
        </div>
      )}

      {/* Audio Player */}
      {audioSrc && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">合成结果</span>
            <a
              href={audioSrc}
              download={`tts_output.${format}`}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>下载</span>
              <span className="text-sm">.{format}</span>
            </a>
          </div>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioSrc} />
          </audio>
        </div>
      )}
    </div>
  )
}
