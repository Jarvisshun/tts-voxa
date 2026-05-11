import { useState, useEffect } from 'react'
import { synthesizeTTS, getModels, getPresets, type TTSRequest } from '../api/client'
import { pcmToWavBase64 } from '../utils/audio'
import WaveformPlayer from '../components/WaveformPlayer'

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
  const [text, setText] = useState('你好，欢迎使用 TTS Voxa！这是一段测试文本。')
  const [voice, setVoice] = useState('mimo_default')
  const [model, setModel] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [emotion, setEmotion] = useState('')
  const [format, setFormat] = useState('wav')
  const [loading, setLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [error, setError] = useState('')
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
        let audioBase64 = resp.data.audio
        let audioFormat = resp.data.format
        // PCM needs WAV header to be playable in browser
        if (audioFormat === 'pcm') {
          audioBase64 = pcmToWavBase64(audioBase64)
          audioFormat = 'wav'
        }
        const audioUrl = `data:audio/${audioFormat};base64,${audioBase64}`
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

  const speedPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

  return (
    <div className="space-y-4">
      {/* Top: Text + Voice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Text Input */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">合成文本</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
              maxLength={5000}
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none text-sm leading-relaxed transition-all"
              placeholder="输入要合成的文本..."
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] text-gray-400">支持中英文混合</span>
              <span className="text-[11px] text-gray-400">{text.length}/5000</span>
            </div>
          </div>
        </div>

        {/* Voice Selector */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
            <label className="block text-sm font-semibold text-gray-700 mb-3">选择音色</label>
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {voices.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    voice === v.id
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                  }`}
                >
                  <div className="font-medium truncate">{v.name}</div>
                  <div className={`text-[11px] mt-0.5 truncate ${voice === v.id ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {v.style}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Model */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">模型</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none truncate"
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
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">输出格式</label>
            <div className="flex gap-1.5">
              {['wav', 'mp3', 'pcm'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200/70'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Speed */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              语速 <span className="text-indigo-500 normal-case font-medium">{speed.toFixed(1)}x</span>
            </label>
            <div className="flex gap-1">
              {speedPresets.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    Math.abs(speed - s) < 0.01
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">情感</label>
            <input
              type="text"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="如: 开心、温柔"
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleSynthesize}
        disabled={loading || !text.trim() || !model}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 rounded-2xl font-medium text-sm text-white transition-all shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50 disabled:shadow-none active:scale-[0.99]"
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
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* Audio Player */}
      {audioSrc && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">合成结果</span>
          </div>
          <WaveformPlayer audioSrc={audioSrc} showDownload downloadFilename={`tts_output.${format}`} />
        </div>
      )}
    </div>
  )
}
