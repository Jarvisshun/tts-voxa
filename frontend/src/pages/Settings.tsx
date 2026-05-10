import { useState, useEffect } from 'react'
import { getVersion, checkUpdate } from '../api/client'
import type { UpdateInfo } from '../api/client'

interface Provider {
  id: string
  name: string
  api_key: string
  api_base: string
  models: Array<{ id: string; name: string; type?: string }>
  is_default: boolean
}

interface ModelEntry {
  id: string
  name: string
  type: string
}

export default function Settings() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState('https://token-plan-sgp.xiaomimimo.com/v1')
  const [modelsText, setModelsText] = useState('')
  const [isDefault, setIsDefault] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Version & update state
  const [currentVersion, setCurrentVersion] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    getVersion().then(d => setCurrentVersion(d.version)).catch(() => {})
  }, [])

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateInfo(null)
    try {
      const info = await checkUpdate()
      setUpdateInfo(info)
    } catch (e: any) {
      setUpdateInfo({ current: currentVersion, latest: currentVersion, has_update: false, download_url: null, release_notes: null, error: `检查失败: ${e.message}` })
    } finally {
      setCheckingUpdate(false)
    }
  }

  const fetchProviders = async () => {
    try {
      const resp = await fetch('/api/config/providers')
      const data = await resp.json()
      if (data.success) setProviders(data.data)
    } catch {}
  }

  useEffect(() => { fetchProviders() }, [])

  const parseModels = (): ModelEntry[] => {
    return modelsText.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, name: id, type: 'basic' }))
  }

  const handleSave = async () => {
    if (!name.trim() || !apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    try {
      const body = { name: name.trim(), api_key: apiKey.trim(), api_base: apiBase.trim(), models: parseModels(), is_default: isDefault }
      const url = editingId ? `/api/config/providers/${editingId}` : '/api/config/providers'
      const method = editingId ? 'PUT' : 'POST'
      const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await resp.json()
      if (data.success) { resetForm(); fetchProviders() }
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally { setLoading(false) }
  }

  const handleTest = async () => {
    if (!apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    setTestResult(null)
    try {
      const resp = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', api_key: apiKey.trim(), api_base: apiBase.trim(), models: [] }),
      })
      const data = await resp.json()
      setTestResult({ type: data.success ? 'success' : 'error', message: data.message })
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此服务商？')) return
    await fetch(`/api/config/providers/${id}`, { method: 'DELETE' })
    fetchProviders()
  }

  const handleEdit = (p: Provider) => {
    setEditingId(p.id)
    setName(p.name)
    setApiKey('')
    setApiBase(p.api_base)
    setModelsText(p.models.map(m => m.id).join(', '))
    setIsDefault(p.is_default)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setApiKey('')
    setApiBase('https://token-plan-sgp.xiaomimimo.com/v1')
    setModelsText('')
    setIsDefault(true)
    setTestResult(null)
  }

  const PRESETS = [
    { name: '小米 MiMo', api_base: 'https://token-plan-sgp.xiaomimimo.com/v1', models: 'mimo-v2.5-tts, mimo-v2-tts, mimo-v2.5-tts-voiceclone, mimo-v2.5-tts-voicedesign' },
    { name: 'OpenAI', api_base: 'https://api.openai.com/v1', models: 'tts-1, tts-1-hd' },
    { name: '自定义', api_base: '', models: '' },
  ]

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name)
    setApiBase(preset.api_base)
    setModelsText(preset.models)
  }

  return (
    <div className="space-y-4">
      {/* Add/Edit Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {editingId ? '编辑服务商' : '添加服务商'}
        </h2>

        <div className="flex gap-1.5 mb-5">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-[11px] bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-gray-500 transition-all font-medium"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">服务商名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="如: 小米 MiMo" className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">API Base URL</label>
            <input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://api.example.com/v1" className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingId ? '留空则不修改' : '输入 API Key'} className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">模型列表</label>
            <input value={modelsText} onChange={e => setModelsText(e.target.value)} placeholder="model-1, model-2（逗号分隔）" className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded accent-indigo-500" />
          <label htmlFor="isDefault" className="text-sm text-gray-500">设为默认服务商</label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !apiKey.trim() || !apiBase.trim()}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200"
          >
            {editingId ? '更新' : '添加'}
          </button>
          <button
            onClick={handleTest}
            disabled={loading || !apiKey.trim() || !apiBase.trim()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm"
          >
            测试连接
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-500 transition-all">
              取消
            </button>
          )}
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${
            testResult.type === 'success'
              ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
              : 'bg-red-50 border border-red-100 text-red-600'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Provider List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">已配置的服务商</h2>
        {providers.length === 0 ? (
          <div className="text-center py-10">
            <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            </svg>
            <p className="text-gray-400 text-sm">尚未配置任何服务商</p>
            <p className="text-gray-300 text-xs mt-1">请在上方添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm truncate">{p.name}</span>
                    {p.is_default && (
                      <span className="px-2 py-0.5 text-[10px] bg-indigo-50 border border-indigo-100 rounded-md text-indigo-600 font-medium shrink-0">默认</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 truncate">{p.api_base}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                    模型: {p.models.map(m => m.id).join(', ') || '未配置'}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-3">
                  <button onClick={() => handleEdit(p)} className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-all shadow-sm">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-500 transition-all">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About & Updates */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">关于 TTS Voxa</h2>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">当前版本</span>
            <span className="ml-2 text-sm font-mono font-medium text-gray-800">v{currentVersion || '...'}</span>
          </div>
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5"
          >
            {checkingUpdate ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                检查中...
              </>
            ) : '检查更新'}
          </button>
        </div>

        {updateInfo && (
          <div className={`mt-4 p-4 rounded-xl border ${
            updateInfo.error
              ? 'bg-red-50 border-red-100'
              : updateInfo.has_update
                ? 'bg-blue-50 border-blue-100'
                : 'bg-emerald-50 border-emerald-100'
          }`}>
            {updateInfo.error ? (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span className="text-red-600 text-sm font-medium">{updateInfo.error}</span>
              </div>
            ) : updateInfo.has_update ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 font-medium text-sm">发现新版本 v{updateInfo.latest}</span>
                </div>
                {updateInfo.release_notes && (
                  <div className="text-xs text-gray-500 mb-3 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {updateInfo.release_notes.slice(0, 500)}
                  </div>
                )}
                <button
                  onClick={() => updateInfo.download_url && window.open(updateInfo.download_url, '_blank')}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium text-white transition-all shadow-sm"
                >
                  下载更新
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span className="text-emerald-600 text-sm font-medium">已是最新版本</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
