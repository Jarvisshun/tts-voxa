import { useState, useEffect, useRef } from 'react'
import { createBatch, getBatchStatus } from '../api/client'

const PRESET_VOICES = [
  { id: 'mimo_default', name: '默认' },
  { id: '冰糖', name: '冰糖' },
  { id: '茉莉', name: '茉莉' },
  { id: '苏打', name: '苏打' },
  { id: '白桦', name: '白桦' },
  { id: 'Mia', name: 'Mia' },
  { id: 'Chloe', name: 'Chloe' },
  { id: 'Milo', name: 'Milo' },
  { id: 'Dean', name: 'Dean' },
]

export default function BatchProcess() {
  const [inputText, setInputText] = useState('')
  const [name, setName] = useState('')
  const [voice, setVoice] = useState('mimo_default')
  const [speed, setSpeed] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const timerRef = useRef<number | null>(null)

  const handleCreate = async () => {
    const texts = inputText.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    if (texts.length === 0 || !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const resp = await createBatch({ name: name.trim(), texts, voice, speed, format: 'wav' })
      if (resp.success) setJobId(resp.data.job_id)
    } catch (e: any) {
      setError(e.message || '创建任务失败')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const resp = await getBatchStatus(jobId)
        if (resp.success) {
          setStatus(resp.data)
          if (resp.data.status === 'completed' && timerRef.current) clearInterval(timerRef.current)
        }
      } catch {}
    }
    poll()
    timerRef.current = window.setInterval(poll, 2000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [jobId])

  const texts = inputText.split('\n').map(t => t.trim()).filter(t => t.length > 0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">批量文本转语音</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如: 有声书第一章"
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">音色</label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none truncate"
              >
                {PRESET_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                语速 <span className="text-indigo-500 normal-case font-medium">{speed.toFixed(1)}x</span>
              </label>
              <div className="flex gap-1">
                {[0.75, 1.0, 1.25, 1.5].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
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
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            文本内容 <span className="text-gray-400 normal-case font-normal">每行一段，共 {texts.length} 段</span>
          </label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            rows={10}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 font-mono placeholder-gray-400 focus:border-indigo-400 focus:outline-none resize-none leading-relaxed"
            placeholder={"第一段文本\n第二段文本\n第三段文本..."}
          />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || texts.length === 0 || !name.trim()}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 rounded-2xl font-medium text-sm text-white transition-all shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '创建中...' : `开始批量合成 (${texts.length} 段)`}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {status && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">任务进度</span>
            <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${
              status.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
              status.status === 'running' ? 'bg-indigo-50 text-indigo-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {status.status === 'completed' ? '已完成' : status.status === 'running' ? '运行中' : status.status}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(status.completed_items / status.total_items) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-400">
            {status.completed_items} / {status.total_items}
          </div>

          {status.results?.length > 0 && (
            <div className="mt-4 space-y-1 max-h-60 overflow-y-auto">
              {status.results.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500">段落 {r.index + 1}</span>
                  <span className={r.status === 'completed' ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                    {r.status === 'completed' ? '完成' : '失败'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
