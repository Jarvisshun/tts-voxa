import { useState, useEffect } from 'react'
import { getHistory, getAudioDataUrlForHistory, deleteHistory } from '../api/client'
import { isNative } from '../platform'
import WaveformPlayer from '../components/WaveformPlayer'

export default function History() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadHistory = async (p: number) => {
    setLoading(true)
    try {
      const resp = await getHistory(p, 20)
      if (resp.success) {
        setItems(resp.data.items)
        setTotal(resp.data.total)
        if (isNative()) {
          const urls: Record<string, string> = {}
          for (const item of resp.data.items) {
            if (item.audio_path) {
              try {
                urls[item.id] = await getAudioDataUrlForHistory(item.id, item.format || 'wav')
              } catch {}
            }
          }
          setAudioUrls(urls)
        }
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHistory(page) }, [page])

  const handleDelete = async (id: string) => {
    if (isNative()) {
      setConfirmDeleteId(id)
      return
    }
    if (!confirm('确定删除此记录？')) return
    await deleteHistory(id)
    loadHistory(page)
  }

  const confirmDeleteItem = async () => {
    if (!confirmDeleteId) return
    await deleteHistory(confirmDeleteId)
    setConfirmDeleteId(null)
    loadHistory(page)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">生成历史</h2>
        <span className="text-xs text-gray-400">共 {total} 条记录</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">加载中...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-gray-400 text-sm">暂无记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{item.text_content}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="text-[11px] text-gray-400">模型: {item.model}</span>
                    {item.voice && <span className="text-[11px] text-gray-400">音色: {item.voice}</span>}
                    {item.emotion && <span className="text-[11px] text-gray-400">情感: {item.emotion}</span>}
                    <span className="text-[11px] text-gray-400">格式: {item.format}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-gray-300 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              {item.audio_path && (
                <div className="mt-3">
                  <WaveformPlayer audioSrc={isNative() ? (audioUrls[item.id] || '') : `/audio/${item.audio_path.split('/').pop()}`} height={32} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all shadow-sm"
          >
            下一页
          </button>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-5">确定删除此记录？删除后无法恢复。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                取消
              </button>
              <button onClick={confirmDeleteItem} className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
