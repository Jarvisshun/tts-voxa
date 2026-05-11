import { useState, useEffect } from 'react'

interface Release {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
}

const GITHUB_REPO = 'Jarvisshun/tts-voxa'

export default function UpdateLog({ onClose }: { onClose: () => void }) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`, {
      headers: { 'Accept': 'application/vnd.github+json' },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReleases(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">更新日志</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">加载中...</div>
          ) : releases.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">暂无更新记录</div>
          ) : (
            <div className="space-y-4">
              {releases.map(r => (
                <div key={r.tag_name} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{r.tag_name}</span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(r.published_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {r.body && (
                    <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {r.body}
                    </div>
                  )}
                  <a
                    href={r.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-[11px] text-indigo-500 hover:text-indigo-600"
                  >
                    在 GitHub 查看
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
