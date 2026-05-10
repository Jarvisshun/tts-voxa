import { useState, useEffect } from 'react'

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

  const inputCls = "w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none transition-all"

  return (
    <div className="space-y-5">
      {/* Add/Edit Form */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-slate-300 mb-4">
          {editingId ? '编辑服务商' : '添加服务商'}
        </h2>

        <div className="flex gap-1.5 mb-5">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-[11px] bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-slate-400 hover:text-slate-300 transition-all"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">服务商名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="如: 小米 MiMo" className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">API Base URL</label>
            <input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://api.example.com/v1" className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingId ? '留空则不修改' : '输入 API Key'} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">模型列表</label>
            <input value={modelsText} onChange={e => setModelsText(e.target.value)} placeholder="model-1, model-2（逗号分隔）" className={inputCls} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded accent-blue-500" />
          <label htmlFor="isDefault" className="text-sm text-slate-400">设为默认服务商</label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !apiKey.trim() || !apiBase.trim()}
            className="px-5 py-2.5 bg-blue-600/80 hover:bg-blue-500/80 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-sm font-medium transition-all"
          >
            {editingId ? '更新' : '添加'}
          </button>
          <button
            onClick={handleTest}
            disabled={loading || !apiKey.trim() || !apiBase.trim()}
            className="px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-500/80 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-sm font-medium transition-all"
          >
            测试连接
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl text-sm text-slate-400 transition-all">
              取消
            </button>
          )}
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${
            testResult.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Provider List */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-slate-300 mb-4">已配置的服务商</h2>
        {providers.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-2 opacity-30"> </div>
            <p className="text-slate-600 text-sm">尚未配置任何服务商</p>
            <p className="text-slate-700 text-xs mt-1">请在上方添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-900/50 rounded-xl p-4 border border-slate-700/30 hover:border-slate-600/30 transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm truncate">{p.name}</span>
                    {p.is_default && (
                      <span className="px-2 py-0.5 text-[10px] bg-blue-600/80 rounded-md text-white shrink-0">默认</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 truncate">{p.api_base}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                    模型: {p.models.map(m => m.id).join(', ') || '未配置'}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-3">
                  <button onClick={() => handleEdit(p)} className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-slate-400 transition-all">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
