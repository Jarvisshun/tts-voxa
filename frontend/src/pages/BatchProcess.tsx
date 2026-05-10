import { useState, useEffect } from 'react'
import { createBatch, getBatchStatus, getBatchList, getBatchItemAudioUrl, getPresets } from '../api/client'
import { useTasks } from '../contexts/TaskContext'
import WaveformPlayer from '../components/WaveformPlayer'

interface VoiceItem {
  id: string
  name: string
}

export default function BatchProcess() {
  const [inputText, setInputText] = useState('')
  const [name, setName] = useState('')
  const [voice, setVoice] = useState('mimo_default')
  const [speed, setSpeed] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [voices, setVoices] = useState<VoiceItem[]>([{ id: 'mimo_default', name: '默认' }])

  // Current active job
  const [activeJobId, setActiveJobId] = useState('')
  const [activeStatus, setActiveStatus] = useState<any>(null)

  // Batch history
  const [batchList, setBatchList] = useState<any[]>([])
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [expandedResults, setExpandedResults] = useState<any>(null)

  const { addTask, updateTask } = useTasks()

  useEffect(() => {
    getPresets().then(res => {
      if (res.success) setVoices(res.data.map((v: any) => ({ id: v.id, name: v.name })))
    }).catch(() => {})
    loadBatchList()
  }, [])

  const loadBatchList = async () => {
    try {
      const resp = await getBatchList()
      if (resp.success) setBatchList(resp.data)
    } catch {}
  }

  const handleCreate = async () => {
    const texts = inputText.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    if (texts.length === 0 || !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const resp = await createBatch({ name: name.trim(), texts, voice, speed, format: 'wav' })
      if (resp.success) {
        const jobId = resp.data.job_id
        setActiveJobId(jobId)
        addTask({
          id: jobId,
          type: 'batch',
          status: 'pending',
          textPreview: name.trim(),
          createdAt: new Date().toISOString(),
          progress: { current: 0, total: resp.data.total_items },
        })
      }
    } catch (e: any) {
      setError(e.message || '创建任务失败')
    } finally {
      setLoading(false)
    }
  }

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return
    const poll = async () => {
      try {
        const resp = await getBatchStatus(activeJobId)
        if (resp.success) {
          setActiveStatus(resp.data)
          updateTask(activeJobId, {
            status: resp.data.status,
            progress: { current: resp.data.completed_items, total: resp.data.total_items },
          })
          if (resp.data.status === 'completed' || resp.data.status === 'failed') {
            loadBatchList()
            return true // stop polling
          }
        }
      } catch {}
      return false
    }

    poll()
    const timer = window.setInterval(async () => {
      const done = await poll()
      if (done) clearInterval(timer)
    }, 2000)
    return () => clearInterval(timer)
  }, [activeJobId])

  // Load expanded job results
  const handleExpandJob = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null)
      setExpandedResults(null)
      return
    }
    setExpandedJob(jobId)
    try {
      const resp = await getBatchStatus(jobId)
      if (resp.success) setExpandedResults(resp.data)
    } catch {}
  }

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
                {voices.map(v => (
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

      {/* Active Job Progress */}
      {activeStatus && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">当前任务进度</span>
            <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${
              activeStatus.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
              activeStatus.status === 'running' ? 'bg-indigo-50 text-indigo-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {activeStatus.status === 'completed' ? '已完成' : activeStatus.status === 'running' ? '运行中' : activeStatus.status}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${activeStatus.total_items > 0 ? (activeStatus.completed_items / activeStatus.total_items) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-400">
            {activeStatus.completed_items} / {activeStatus.total_items}
          </div>

          {activeStatus.results?.length > 0 && (
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {activeStatus.results.map((r: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">段落 {r.item_index + 1}</span>
                    <span className={r.status === 'completed' ? 'text-emerald-500 text-xs font-medium' : 'text-red-500 text-xs font-medium'}>
                      {r.status === 'completed' ? '完成' : '失败'}
                    </span>
                  </div>
                  {r.status === 'completed' && r.audio_path && (
                    <WaveformPlayer
                      audioSrc={getBatchItemAudioUrl(activeJobId, r.item_index)}
                      height={32}
                      showDownload
                      downloadFilename={`batch_${r.item_index + 1}.wav`}
                    />
                  )}
                  {r.status === 'failed' && r.error_message && (
                    <div className="text-xs text-red-500">{r.error_message}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batch History */}
      {batchList.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">历史任务</h3>
          <div className="space-y-2">
            {batchList.map(job => (
              <div key={job.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => handleExpandJob(job.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      job.status === 'completed' ? 'bg-emerald-400' :
                      job.status === 'running' ? 'bg-indigo-400 animate-pulse' :
                      job.status === 'failed' ? 'bg-red-400' : 'bg-gray-300'
                    }`} />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-700 truncate">{job.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {job.completed_items}/{job.total_items} 段
                        {job.created_at && ` · ${new Date(job.created_at).toLocaleString('zh-CN')}`}
                      </div>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {expandedJob === job.id && expandedResults && (
                  <div className="border-t border-gray-100 p-3 space-y-2 max-h-60 overflow-y-auto bg-gray-50/50">
                    {expandedResults.results?.map((r: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500">段落 {r.item_index + 1}</span>
                          <span className={r.status === 'completed' ? 'text-emerald-500 text-[11px] font-medium' : 'text-red-500 text-[11px] font-medium'}>
                            {r.status === 'completed' ? '完成' : '失败'}
                          </span>
                        </div>
                        {r.status === 'completed' && r.audio_path && (
                          <WaveformPlayer
                            audioSrc={getBatchItemAudioUrl(job.id, r.item_index)}
                            height={28}
                            showDownload
                            downloadFilename={`batch_${r.item_index + 1}.wav`}
                          />
                        )}
                        {r.status === 'failed' && r.error_message && (
                          <div className="text-[11px] text-red-500">{r.error_message}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
