import { useState, useEffect } from 'react'
import { getHistory, getAudioDataUrlForHistory } from '../api/client'
import { isNative } from '../platform'
import WaveformPlayer from '../components/WaveformPlayer'

export default function History() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})

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
                <span className="text-[11px] text-gray-300 whitespace-nowrap shrink-0">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </span>
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
    </div>
  )
}
