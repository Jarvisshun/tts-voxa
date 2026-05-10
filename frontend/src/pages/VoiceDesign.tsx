import { useState } from 'react'
import { designVoice } from '../api/client'
import WaveformPlayer from '../components/WaveformPlayer'

export default function VoiceDesign() {
  const [description, setDescription] = useState('温柔的女声，语速适中，带点甜美的感觉')
  const [text, setText] = useState('你好，这是我设计的声音，希望你喜欢！')
  const [format, setFormat] = useState('wav')
  const [loading, setLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [error, setError] = useState('')
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

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">声音设计</h2>
        <p className="text-[11px] text-gray-400 mb-4">用自然语言描述你想要的声音特征，AI 会为你生成全新的虚拟声音</p>

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none resize-none leading-relaxed"
          placeholder="描述你想要的声音特征..."
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setDescription(ex)}
              className="text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-600 hover:text-violet-700 px-2.5 py-1.5 rounded-lg transition-all truncate max-w-[200px]"
              title={ex}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Text + Format */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:border-violet-400 focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">输出格式</label>
          <div className="flex gap-1.5">
            {['wav', 'mp3'].map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  format === f
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200/70'
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
        className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 rounded-2xl font-medium text-sm text-white transition-all shadow-lg shadow-violet-200/50 hover:shadow-violet-300/50 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '正在生成...' : '生成声音'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {audioSrc && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">生成结果</span>
          </div>
          <WaveformPlayer audioSrc={audioSrc} showDownload downloadFilename={`design_output.${format}`} />
        </div>
      )}
    </div>
  )
}
