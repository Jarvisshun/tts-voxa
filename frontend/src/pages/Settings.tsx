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

  // Form state
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

  useEffect(() => {
    fetchProviders()
  }, [])

  const parseModels = (): ModelEntry[] => {
    return modelsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(id => ({ id, name: id, type: 'basic' }))
  }

  const handleSave = async () => {
    if (!name.trim() || !apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    try {
      const body = {
        name: name.trim(),
        api_key: apiKey.trim(),
        api_base: apiBase.trim(),
        models: parseModels(),
        is_default: isDefault,
      }

      const url = editingId ? `/api/config/providers/${editingId}` : '/api/config/providers'
      const method = editingId ? 'PUT' : 'POST'

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      if (data.success) {
        resetForm()
        fetchProviders()
      }
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    setTestResult(null)
    try {
      const resp = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test',
          api_key: apiKey.trim(),
          api_base: apiBase.trim(),
          models: [],
        }),
      })
      const data = await resp.json()
      setTestResult({
        type: data.success ? 'success' : 'error',
        message: data.message,
      })
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此服务商？')) return
    await fetch(`/api/config/providers/${id}`, { method: 'DELETE' })
    fetchProviders()
  }

  const handleEdit = (p: Provider) => {
    setEditingId(p.id)
    setName(p.name)
    setApiKey('') // don't fill masked key
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
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">
          {editingId ? '编辑服务商' : '添加服务商'}
        </h2>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">服务商名称</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如: 小米 MiMo"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Base URL</label>
            <input
              value={apiBase}
              onChange={e => setApiBase(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={editingId ? '留空则不修改' : '输入 API Key'}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">模型列表（逗号分隔）</label>
            <input
              value={modelsText}
              onChange={e => setModelsText(e.target.value)}
              placeholder="model-1, model-2"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isDefault" className="text-sm text-slate-300">设为默认服务商</label>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !apiKey.trim() || !apiBase.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium"
          >
            {editingId ? '更新' : '添加'}
          </button>
          <button
            onClick={handleTest}
            disabled={loading || !apiKey.trim() || !apiBase.trim()}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium"
          >
            测试连接
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
              取消
            </button>
          )}
        </div>

        {testResult && (
          <div className={`mt-3 p-3 rounded text-sm ${
            testResult.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Provider List */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">已配置的服务商</h2>
        {providers.length === 0 ? (
          <p className="text-slate-500 text-sm">尚未配置任何服务商，请在上方添加。</p>
        ) : (
          <div className="space-y-3">
            {providers.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{p.name}</span>
                    {p.is_default && (
                      <span className="px-2 py-0.5 text-xs bg-blue-600 rounded text-white">默认</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{p.api_base}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    模型: {p.models.map(m => m.id).join(', ') || '未配置'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 rounded text-red-300">
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
