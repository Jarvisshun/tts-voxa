import { useState, useEffect } from 'react'
import { getHistory } from '../api/client'

export default function History() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadHistory = async (p: number) => {
    setLoading(true)
    try {
      const resp = await getHistory(p, 20)
      if (resp.success) {
        setItems(resp.data.items)
        setTotal(resp.data.total)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(page)
  }, [page])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">生成历史</h2>
        <span className="text-sm text-slate-400">共 {total} 条记录</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无记录</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{item.text_content}</div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span>模型: {item.model}</span>
                    {item.voice && <span>音色: {item.voice}</span>}
                    {item.emotion && <span>情感: {item.emotion}</span>}
                    <span>格式: {item.format}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 ml-4 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
              {item.audio_path && (
                <audio controls className="w-full mt-3" preload="none">
                  <source src={`/audio/${item.audio_path.split('/').pop()}`} />
                </audio>
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
            className="px-3 py-1 bg-slate-800 rounded text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm text-slate-400">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1 bg-slate-800 rounded text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
