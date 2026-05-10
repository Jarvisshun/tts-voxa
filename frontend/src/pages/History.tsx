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

  useEffect(() => { loadHistory(page) }, [page])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-300">生成历史</h2>
        <span className="text-xs text-slate-600">共 {total} 条记录</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-2 opacity-30"> </div>
          <p className="text-slate-600 text-sm">暂无记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-slate-800/60 border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/30 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 truncate">{item.text_content}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="text-[11px] text-slate-600">模型: {item.model}</span>
                    {item.voice && <span className="text-[11px] text-slate-600">音色: {item.voice}</span>}
                    {item.emotion && <span className="text-[11px] text-slate-600">情感: {item.emotion}</span>}
                    <span className="text-[11px] text-slate-600">格式: {item.format}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-700 whitespace-nowrap shrink-0">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </span>
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
            className="px-4 py-2 bg-slate-800/60 border border-slate-700/30 rounded-xl text-sm text-slate-400 disabled:opacity-30 hover:bg-slate-700/50 transition-all"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">
            {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 bg-slate-800/60 border border-slate-700/30 rounded-xl text-sm text-slate-400 disabled:opacity-30 hover:bg-slate-700/50 transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
