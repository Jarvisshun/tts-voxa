import { useState, useEffect, useRef } from 'react'
import { getVersion, checkUpdate } from '../api/client'
import type { UpdateInfo } from '../api/client'
import { isNative } from '../platform'
import UpdateLog from './UpdateLog'
import { initSupabase, signUp, signIn, signInWithMagicLink, signOut, getCurrentUser, onAuthStateChange } from '../api/supabase'
import { syncAll } from '../db/sync'
import type { User } from '@supabase/supabase-js'
import Spinner from '../components/Spinner'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import type { Provider, ModelConfig } from '../api/types'

const DEFAULT_API_BASE = 'https://token-plan-cn.xiaomimimo.com/v1'

export default function Settings() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  const [modelsText, setModelsText] = useState('')
  const [isDefault, setIsDefault] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Version & update state
  const [currentVersion, setCurrentVersion] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showUpdateLog, setShowUpdateLog] = useState(false)

  // Cloud sync state
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('supabase_key') || '')
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'magic'>('login')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    getVersion().then(d => setCurrentVersion(d.version)).catch(() => {})
  }, [])

  // Initialize Supabase on mount if config exists
  useEffect(() => {
    const url = localStorage.getItem('supabase_url')
    const key = localStorage.getItem('supabase_key')
    if (url && key) {
      initSupabase(url, key)
      setSupabaseConnected(true)
      let cancelled = false
      getCurrentUser().then(u => { if (!cancelled) setAuthUser(u) })
      const unsub = onAuthStateChange(u => { if (!cancelled) setAuthUser(u) })
      unsubRef.current = unsub
      return () => { cancelled = true; unsub() }
    }
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

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.download_url) return
    if (isNative()) {
      setDownloading(true)
      setDownloadProgress(0)
      try {
        const { downloadApk } = await import('../storage/audioStorage')
        await downloadApk(updateInfo.download_url, setDownloadProgress)
      } catch (e: any) {
        setUpdateInfo(prev => prev ? { ...prev, error: `下载失败: ${e.message}` } : prev)
      } finally {
        setDownloading(false)
      }
    } else {
      window.open(updateInfo.download_url, '_blank')
    }
  }

  const fetchProviders = async () => {
    try {
      const { getProviders } = await import('../api/client')
      const data = await getProviders()
      if (data.success && Array.isArray(data.data)) {
        setProviders(data.data)
      }
    } catch (e) {
      console.error('fetchProviders error:', e)
    }
  }

  useEffect(() => { fetchProviders() }, [])

  const handleConnectSupabase = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) return
    localStorage.setItem('supabase_url', supabaseUrl.trim())
    localStorage.setItem('supabase_key', supabaseKey.trim())
    initSupabase(supabaseUrl.trim(), supabaseKey.trim())
    setSupabaseConnected(true)
    getCurrentUser().then(setAuthUser)
    unsubRef.current?.()
    unsubRef.current = onAuthStateChange(setAuthUser)
  }

  const handleDisconnectSupabase = () => {
    unsubRef.current?.()
    unsubRef.current = null
    localStorage.removeItem('supabase_url')
    localStorage.removeItem('supabase_key')
    setSupabaseConnected(false)
    setAuthUser(null)
    setSupabaseUrl('')
    setSupabaseKey('')
  }

  const handleAuth = async () => {
    if (!authEmail.trim() || (authMode !== 'magic' && !authPassword.trim())) return
    setAuthLoading(true)
    setAuthError(null)
    try {
      if (authMode === 'register') {
        const { user, error } = await signUp(authEmail.trim(), authPassword)
        if (error) { setAuthError(error); return }
        if (user) setAuthUser(user)
      } else if (authMode === 'login') {
        const { user, error } = await signIn(authEmail.trim(), authPassword)
        if (error) { setAuthError(error); return }
        if (user) setAuthUser(user)
      } else {
        const { error } = await signInWithMagicLink(authEmail.trim())
        if (error) { setAuthError(error); return }
        setAuthError('已发送登录链接到邮箱，请查收')
      }
      setAuthEmail(''); setAuthPassword('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '操作失败'
      setAuthError(msg)
    } finally { setAuthLoading(false) }
  }

  const handleSignOut = async () => {
    await signOut()
    setAuthUser(null)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      await syncAll()
      setSyncResult('同步完成')
    } catch (e) {
      console.error('Sync failed:', e)
      setSyncResult('同步失败')
    } finally { setSyncing(false) }
  }

  const parseModels = (): ModelConfig[] => {
    return modelsText.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, name: id, type: 'basic' }))
  }

  const handleSave = async () => {
    if (!name.trim() || !apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    try {
      const { addProvider, updateProvider } = await import('../api/client')
      const models = parseModels()
      if (editingId) {
        await updateProvider(editingId, name.trim(), apiKey.trim(), apiBase.trim(), models, isDefault)
      } else {
        await addProvider(name.trim(), apiKey.trim(), apiBase.trim(), models, isDefault)
      }
      resetForm(); fetchProviders()
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally { setLoading(false) }
  }

  const handleTest = async () => {
    if (!apiKey.trim() || !apiBase.trim()) return
    setLoading(true)
    setTestResult(null)
    try {
      const { testConnection } = await import('../api/client')
      const data = await testConnection(apiKey.trim(), apiBase.trim())
      setTestResult({ type: data.success ? 'success' : 'error', message: data.message })
    } catch (e: any) {
      setTestResult({ type: 'error', message: e.message })
    } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (isNative()) {
      setConfirmDelete(id)
      return
    }
    if (!confirm('确定删除此服务商？')) return
    const { deleteProvider } = await import('../api/client')
    await deleteProvider(id)
    fetchProviders()
  }

  const confirmDeleteProvider = async () => {
    if (!confirmDelete) return
    const id = confirmDelete
    setConfirmDelete(null)
    const { deleteProvider } = await import('../api/client')
    await deleteProvider(id)
    fetchProviders()
  }

  const handleEdit = (p: Provider) => {
    setEditingId(p.id)
    setName(p.name)
    setApiKey('')
    setApiBase(p.api_base)
    const models = Array.isArray(p.models) ? p.models.map(m => m.id || m) : []
    setModelsText(models.join(', '))
    setIsDefault(p.is_default)
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setApiKey('')
    setApiBase(DEFAULT_API_BASE)
    setModelsText('')
    setIsDefault(true)
    setTestResult(null)
  }

  const PRESETS = [
    { name: '小米 MiMo', api_base: DEFAULT_API_BASE, models: 'mimo-v2.5-tts, mimo-v2-tts, mimo-v2.5-tts-voiceclone, mimo-v2.5-tts-voicedesign' },
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
      {/* Cloud Sync Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">云端同步</h2>
          {supabaseConnected && (
            <button
              onClick={() => setShowSupabaseConfig(!showSupabaseConfig)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showSupabaseConfig ? '收起' : '配置'}
            </button>
          )}
        </div>

        {!supabaseConnected ? (
          <div>
            <p className="text-xs text-gray-400 mb-4">连接 Supabase 以启用跨设备数据同步。数据将端到端加密存储。</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Supabase URL</label>
                <input value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder="https://xxx.supabase.co" className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Anon Key</label>
                <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} placeholder="eyJ..." className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
              </div>
            </div>
            <button
              onClick={handleConnectSupabase}
              disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
              className="mt-4 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200"
            >
              连接
            </button>
          </div>
        ) : (
          <div>
            {showSupabaseConfig && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">已连接: {supabaseUrl}</span>
                  <button onClick={handleDisconnectSupabase} className="text-xs text-red-400 hover:text-red-600 transition-colors">断开连接</button>
                </div>
              </div>
            )}

            {!authUser ? (
              <div>
                <div className="flex gap-1.5 mb-4">
                  {(['login', 'register', 'magic'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setAuthMode(mode); setAuthError(null) }}
                      className={`px-3 py-1.5 text-[11px] rounded-lg font-medium transition-all ${
                        authMode === mode ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '邮箱链接'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="邮箱地址"
                    type="email"
                    className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all"
                  />
                  {authMode !== 'magic' && (
                    <div className="relative">
                      <input
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="密码"
                        type={showAuthPassword ? 'text' : 'password'}
                        className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all"
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                      />
                      <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showAuthPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {authError && (
                  <p className={`mt-2 text-xs ${authError.includes('已发送') ? 'text-emerald-500' : 'text-red-500'}`}>{authError}</p>
                )}
                <button
                  onClick={handleAuth}
                  disabled={authLoading || !authEmail.trim() || (authMode !== 'magic' && !authPassword.trim())}
                  className="mt-4 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200"
                >
                  {authLoading ? '处理中...' : authMode === 'login' ? '登录' : authMode === 'register' ? '注册' : '发送链接'}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{authUser.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">已登录</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5"
                    >
                      {syncing ? (
                        <>
                          <Spinner />
                          同步中...
                        </>
                      ) : '立即同步'}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-500 transition-all"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
                {syncResult && (
                  <p className="mt-2 text-xs text-emerald-500">{syncResult}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
            <div className="relative">
              <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingId ? '留空则不修改' : '输入 API Key'} className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-all" />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showApiKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                )}
              </button>
            </div>
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
                    模型: {Array.isArray(p.models) ? p.models.map(m => m.id || m).join(', ') : '未配置'}
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpdateLog(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-all"
            >
              更新日志
            </button>
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5"
            >
              {checkingUpdate ? (
                <>
                  <Spinner />
                  检查中...
                </>
              ) : '检查更新'}
            </button>
          </div>
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
                  onClick={handleDownloadUpdate}
                  disabled={downloading}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm"
                >
                  {downloading ? `下载中 ${downloadProgress}%` : '下载更新'}
                </button>
                {downloading && (
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                  </div>
                )}
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

      {/* Update Log Modal */}
      {showUpdateLog && <UpdateLog onClose={() => setShowUpdateLog(false)} />}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        message="确定删除此服务商？删除后无法恢复。"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteProvider}
      />
    </div>
  )
}
