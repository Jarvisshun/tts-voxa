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
    <div className="space-y-5">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-slate-300 mb-4">批量文本转语音</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如: 有声书第一章"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">音色</label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none truncate"
              >
                {PRESET_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                语速 <span className="text-blue-400 normal-case">{speed.toFixed(1)}x</span>
              </label>
              <div className="flex gap-1">
                {[0.75, 1.0, 1.25, 1.5].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
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
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            文本内容 <span className="text-slate-600 normal-case">每行一段，共 {texts.length} 段</span>
          </label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            rows={10}
            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-200 font-mono focus:border-blue-500/50 focus:outline-none resize-none leading-relaxed"
            placeholder={"第一段文本\n第二段文本\n第三段文本..."}
          />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || texts.length === 0 || !name.trim()}
        className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '创建中...' : `开始批量合成 (${texts.length} 段)`}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {status && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">任务进度</span>
            <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${
              status.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
              status.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
              'bg-slate-700/50 text-slate-500'
            }`}>
              {status.status === 'completed' ? '已完成' : status.status === 'running' ? '运行中' : status.status}
            </span>
          </div>

          <div className="w-full bg-slate-700/30 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(status.completed_items / status.total_items) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-600">
            {status.completed_items} / {status.total_items}
          </div>

          {status.results?.length > 0 && (
            <div className="mt-4 space-y-1 max-h-60 overflow-y-auto">
              {status.results.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-900/30 rounded-lg px-3 py-2">
                  <span className="text-slate-500">段落 {r.index + 1}</span>
                  <span className={r.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}>
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
