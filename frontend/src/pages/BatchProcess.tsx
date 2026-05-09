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
    const texts = inputText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    if (texts.length === 0 || !name.trim()) return

    setLoading(true)
    setError('')

    try {
      const resp = await createBatch({
        name: name.trim(),
        texts,
        voice,
        speed,
        format: 'wav',
      })
      if (resp.success) {
        setJobId(resp.data.job_id)
      }
    } catch (e: any) {
      setError(e.message || '创建任务失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      try {
        const resp = await getBatchStatus(jobId)
        if (resp.success) {
          setStatus(resp.data)
          if (resp.data.status === 'completed') {
            if (timerRef.current) clearInterval(timerRef.current)
          }
        }
      } catch {}
    }

    poll()
    timerRef.current = window.setInterval(poll, 2000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [jobId])

  const texts = inputText
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">批量文本转语音</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如: 有声书第一章"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">音色</label>
              <select
                value={voice}
                onChange={e => setVoice(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-2 text-slate-200 text-sm"
              >
                {PRESET_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">语速: {speed.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            文本内容 (每行一段，共 {texts.length} 段)
          </label>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            rows={10}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
            placeholder="第一段文本&#10;第二段文本&#10;第三段文本..."
          />
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || texts.length === 0 || !name.trim()}
        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors"
      >
        {loading ? '创建中...' : `开始批量合成 (${texts.length} 段)`}
      </button>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {status && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-300">任务进度</div>
            <span className={`text-xs px-2 py-1 rounded ${
              status.status === 'completed' ? 'bg-green-900 text-green-300' :
              status.status === 'running' ? 'bg-blue-900 text-blue-300' :
              'bg-slate-700 text-slate-400'
            }`}>
              {status.status}
            </span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(status.completed_items / status.total_items) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
            {status.completed_items} / {status.total_items}
          </div>

          {status.results?.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {status.results.map((r: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-slate-700/50 rounded px-3 py-2"
                >
                  <span className="text-slate-400">段落 {r.index + 1}</span>
                  <span className={r.status === 'completed' ? 'text-green-400' : 'text-red-400'}>
                    {r.status}
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
