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
      const resp = await designVoice({
        description: description.trim(),
        text: text.trim(),
        format,
      })
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
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-2">声音设计</h2>
        <p className="text-sm text-slate-400 mb-4">
          用自然语言描述你想要的声音特征，AI 会为你生成全新的虚拟声音
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">声音描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="描述你想要的声音特征..."
            />
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">示例描述 (点击使用)</div>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(ex)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">输出格式</label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200"
          >
            <option value="wav">WAV</option>
            <option value="mp3">MP3</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !description.trim() || !text.trim()}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors"
      >
        {loading ? '正在生成...' : '生成声音'}
      </button>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {audioSrc && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">生成结果</div>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioSrc} />
          </audio>
          <a
            href={audioSrc}
            download={`design_output.${format}`}
            className="inline-block mt-2 text-sm text-purple-400 hover:text-purple-300"
          >
            下载音频
          </a>
        </div>
      )}
    </div>
  )
}
