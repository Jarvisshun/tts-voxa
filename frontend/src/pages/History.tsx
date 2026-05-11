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
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
                urls[item.id] = await getAudioDataUrlForHistory(item.audio_path, item.format || 'wav')
              } catch (e) {
                console.warn('Failed to load audio for history item:', item.id, e)
              }
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
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full p-4 text-left"
              >
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
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expandable detail view */}
              {expandedId === item.id && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">合成文本</div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{item.text_content}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-[11px] text-gray-400">模型</div>
                        <div className="text-sm text-gray-700 mt-0.5">{item.model}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-[11px] text-gray-400">音色</div>
                        <div className="text-sm text-gray-700 mt-0.5">{item.voice || '默认'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-[11px] text-gray-400">输出格式</div>
                        <div className="text-sm text-gray-700 mt-0.5">{item.format}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <div className="text-[11px] text-gray-400">语速</div>
                        <div className="text-sm text-gray-700 mt-0.5">{item.speed ?? 1.0}x</div>
                      </div>
                      {item.emotion && (
                        <div className="bg-gray-50 rounded-xl p-2.5 col-span-2">
                          <div className="text-[11px] text-gray-400">情感风格</div>
                          <div className="text-sm text-gray-700 mt-0.5">{item.emotion}</div>
                        </div>
                      )}
                    </div>
                    {item.audio_path && (
                      <div className="mt-2">
                        {isNative() ? (
                          audioUrls[item.id] ? (
                            <WaveformPlayer audioSrc={audioUrls[item.id]} height={32} />
                          ) : (
                            <div className="flex items-center justify-center py-3 text-xs text-gray-400">
                              <svg className="w-3.5 h-3.5 animate-spin mr-1.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              加载音频中...
                            </div>
                          )
                        ) : (
                          <WaveformPlayer audioSrc={`/audio/${item.audio_path.split('/').pop()}`} height={32} />
                        )}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                        className="px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        删除此记录
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsed waveform */}
              {expandedId !== item.id && item.audio_path && (
                <div className="px-4 pb-4">
                  {isNative() ? (
                    audioUrls[item.id] ? (
                      <WaveformPlayer audioSrc={audioUrls[item.id]} height={32} />
                    ) : (
                      <div className="flex items-center justify-center py-3 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5 animate-spin mr-1.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        加载音频中...
                      </div>
                    )
                  ) : (
                    <WaveformPlayer audioSrc={`/audio/${item.audio_path.split('/').pop()}`} height={32} />
                  )}
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
