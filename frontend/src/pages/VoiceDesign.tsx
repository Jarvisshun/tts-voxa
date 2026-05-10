import { useState, useRef, useEffect } from 'react'
import { designVoice } from '../api/client'

export default function VoiceDesign() {
  const [description, setDescription] = useState('温柔的女声，语速适中，带点甜美的感觉')
  const [text, setText] = useState('你好，这是我设计的声音，希望你喜欢！')
  const [format, setFormat] = useState('wav')
  const [loading, setLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const examples = [
    '温柔的女声，语速适中，带点甜美的感觉',
    '低沉的男声，像新闻播音员一样专业',
    '活泼的少女声音，语调上扬，充满活力',
    '沉稳的中年男声，带点沙哑，有磁性',
    '清亮的童声，天真烂漫',
  ]

  const handleGenerate = async () => {
    if (!description.trim() || !text.trim()) return
    setLoading(true)
    setError('')
    setAudioSrc('')

    try {
      const resp = await designVoice({ description: description.trim(), text: text.trim(), format })
      if (resp.success && resp.data) {
        const audioUrl = `data:audio/${resp.data.format};base64,${resp.data.audio}`
        setAudioSrc(audioUrl)
      } else {
        setError('生成失败')
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
    <div className="space-y-5">
      {/* Description */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-slate-300 mb-1">声音设计</h2>
        <p className="text-[11px] text-slate-600 mb-4">用自然语言描述你想要的声音特征，AI 会为你生成全新的虚拟声音</p>

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 focus:outline-none resize-none leading-relaxed"
          placeholder="描述你想要的声音特征..."
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setDescription(ex)}
              className="text-[11px] bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300 px-2.5 py-1.5 rounded-lg transition-all truncate max-w-[200px]"
              title={ex}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Text + Format */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="block text-sm font-medium text-slate-300 mb-3">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:border-purple-500/50 focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="block text-sm font-medium text-slate-300 mb-3">输出格式</label>
          <div className="flex gap-1">
            {['wav', 'mp3'].map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  format === f
                    ? 'bg-purple-600/80 text-white shadow-sm'
                    : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'
                }`}
              >
                {f.toUpperCase()}
              </button>
              ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !description.trim() || !text.trim()}
        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-500 hover:to-violet-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '正在生成...' : '生成声音'}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {audioSrc && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">生成结果</span>
            <a href={audioSrc} download={`design_output.${format}`} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              下载 .{format}
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
