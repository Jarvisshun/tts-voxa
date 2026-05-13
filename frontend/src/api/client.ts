import { isNative, APP_VERSION } from '../platform'
import type { TTSRequest, TTSResponse, VoiceDesignRequest, BatchCreateRequest, UpdateInfo, BatchJobStatus, HistoryItem, TaskItem, Provider, ModelConfig } from './types'
import { scheduleBackgroundSync } from '../db/sync'

// Dynamic imports for native-only modules (avoids loading Capacitor plugins on desktop)
let _mimoApi: typeof import('./mimoApi') | null = null
let _db: typeof import('../db/database') | null = null
let _audioStorage: typeof import('../storage/audioStorage') | null = null

async function getMimoApi() {
  if (!_mimoApi) _mimoApi = await import('./mimoApi')
  return _mimoApi
}
async function getDb() {
  if (!_db) _db = await import('../db/database')
  return _db
}
async function getAudioStorage() {
  if (!_audioStorage) _audioStorage = await import('../storage/audioStorage')
  return _audioStorage
}

export type { TTSRequest, TTSResponse, VoiceDesignRequest, BatchCreateRequest, UpdateInfo }

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return resp.json()
}

export async function synthesizeTTS(req: TTSRequest): Promise<TTSResponse> {
  if (isNative()) {
    const result = await (await getMimoApi()).synthesizeAndSave(req)
    scheduleBackgroundSync()
    return result
  }
  return request('/tts/synthesize', { method: 'POST', body: JSON.stringify(req) })
}

export async function synthesizeStream(req: TTSRequest): Promise<ReadableStream> {
  if (isNative()) {
    const gen = (await getMimoApi()).ttsStream(req)
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await gen.next()
        if (done) { controller.close(); return }
        controller.enqueue(new TextEncoder().encode(JSON.stringify(value)))
      },
    })
  }
  const resp = await fetch(`${API_BASE}/tts/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!resp.ok) throw new Error('Stream request failed')
  return resp.body!
}

export async function cloneSynthesize(
  audioFile: File,
  text: string,
  format?: string,
  emotion?: string
): Promise<TTSResponse> {
  if (isNative()) {
    const base64 = await fileToBase64(audioFile)
    const audioFormat = audioFile.name.split('.').pop() || 'wav'
    const result = await (await getMimoApi()).cloneAndSave(base64, audioFormat, text, format, emotion)
    scheduleBackgroundSync()
    return result
  }
  const form = new FormData()
  form.append('audio', audioFile)
  form.append('text', text)
  if (format) form.append('format', format)
  if (emotion) form.append('emotion', emotion)
  const resp = await fetch(`${API_BASE}/clone/synthesize`, { method: 'POST', body: form })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(err.detail || 'Clone request failed')
  }
  return resp.json()
}

export async function cloneSave(
  audioFile: File,
  name: string
): Promise<{ success: boolean; data: { voice_id: string; name: string } }> {
  if (isNative()) {
    const voiceId = `voice_${crypto.randomUUID().slice(0, 12)}`
    const base64 = await fileToBase64(audioFile)
    const format = audioFile.name.split('.').pop() || 'wav'
    const { saveVoice } = await import('../db/database')
    const { saveAudio } = await import('../storage/audioStorage')
    const audioPath = await saveAudio(base64, format, voiceId)
    await saveVoice(voiceId, name, 'clone', voiceId, '', audioPath)
    scheduleBackgroundSync()
    return { success: true, data: { voice_id: voiceId, name } }
  }
  const form = new FormData()
  form.append('audio', audioFile)
  form.append('name', name)
  const resp = await fetch(`${API_BASE}/clone/save`, { method: 'POST', body: form })
  if (!resp.ok) throw new Error('Save voice failed')
  return resp.json()
}

export async function designVoice(req: VoiceDesignRequest): Promise<TTSResponse> {
  if (isNative()) {
    const result = await (await getMimoApi()).designAndSave(req)
    scheduleBackgroundSync()
    return result
  }
  return request('/design/generate', { method: 'POST', body: JSON.stringify(req) })
}

export async function createBatch(req: BatchCreateRequest) {
  if (isNative()) {
    const d = await getDb()
    const result = await d.createBatchJob(req.name, req.texts, req.voice || 'mimo_default', req.model || 'mimo-v2.5-tts', req.format || 'wav', req.speed || 1.0)
    processBatchNative(result.job_id)
    scheduleBackgroundSync()
    return { success: true, data: result }
  }
  return request<{ success: boolean; data: { job_id: string; total_items: number } }>(
    '/batch/create', { method: 'POST', body: JSON.stringify(req) }
  )
}

async function processBatchNative(jobId: string) {
  try {
    const d = await getDb()
    const mimo = await getMimoApi()
    const storage = await getAudioStorage()
    await d.updateBatchJobStatus(jobId, 'running')
    const status = await d.getBatchJobStatus(jobId)
    if (!status) return
    const job = status
    const items = job.items || []
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await mimo.tts({ text: items[i].text_content, model: job.model, voice: job.voice, format: job.format, speed: job.speed })
        const audioPath = await storage.saveAudio(result.audio, result.format, items[i].id)
        await d.updateBatchItemStatus(items[i].id, 'completed', audioPath)
        await insertBatchGeneration(items[i].id, job.model, job.voice, items[i].text_content, audioPath, job.format, job.speed)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        await d.updateBatchItemStatus(items[i].id, 'failed', undefined, message)
      }
      await d.updateBatchJobProgress(jobId, i + 1)
      await new Promise(r => setTimeout(r, 0))
    }
    await d.updateBatchJobStatus(jobId, 'completed')
  } catch {
    // jobId is in scope, but we need db again
    const d = await getDb()
    await d.updateBatchJobStatus(jobId, 'failed')
  }
}

async function insertBatchGeneration(id: string, model: string, voice: string, text: string, audioPath: string, format: string, speed: number) {
  try {
    await (await getDb()).insertGeneration(id, model, voice, text, audioPath, format, speed, null)
  } catch (e) { console.error('insertBatchGeneration failed:', e) }
}

export async function getBatchStatus(jobId: string) {
  if (isNative()) {
    const data = await (await getDb()).getBatchJobStatus(jobId)
    return { success: true, data }
  }
  return request<{ success: boolean; data: BatchJobStatus }>(`/batch/${jobId}/status`)
}

export async function getPresets() {
  if (isNative()) {
    return {
      success: true,
      data: [
        { id: 'mimo_default', name: '默认', style: '标准音色' },
        { id: '冰糖', name: '冰糖', style: '甜美女声' },
        { id: '茉莉', name: '茉莉', style: '温柔女声' },
        { id: '苏打', name: '苏打', style: '活泼女声' },
        { id: '白桦', name: '白桦', style: '沉稳男声' },
        { id: 'Mia', name: 'Mia', style: '英文女声' },
        { id: 'Chloe', name: 'Chloe', style: '英文女声' },
        { id: 'Milo', name: 'Milo', style: '英文男声' },
        { id: 'Dean', name: 'Dean', style: '英文男声' },
      ],
    }
  }
  return request<{ success: boolean; data: Array<{ id: string; name: string; style: string }> }>('/voices/presets')
}

export async function getModels() {
  if (isNative()) {
    const providers = await (await getDb()).getProviders()
    const models: Array<{ id: string; name: string; type: string; provider?: string }> = []
    for (const p of providers) {
      const pModels = Array.isArray(p.models) ? p.models : []
      for (const m of pModels) {
        const id = typeof m === 'string' ? m : m.id || m.name || ''
        const name = typeof m === 'string' ? m : m.name || m.id || ''
        const type = typeof m === 'string' ? 'basic' : (m.type || 'basic')
        if (id) models.push({ id, name, type, provider: p.name })
      }
    }
    return { success: true, data: models }
  }
  return request<{ success: boolean; data: Array<{ id: string; name: string; type: string; provider?: string }> }>(
    '/config/models'
  )
}

export async function getHistory(page = 1, limit = 20) {
  if (isNative()) {
    const data = await (await getDb()).getHistory(page, limit)
    return { success: true, data }
  }
  return request<{ success: boolean; data: { items: HistoryItem[]; total: number } }>(
    `/history?page=${page}&limit=${limit}`
  )
}

export async function getRecentTasks(limit = 20) {
  if (isNative()) {
    const data = await (await getDb()).getRecentTasks(limit)
    return { success: true, data }
  }
  return request<{ success: boolean; data: TaskItem[] }>(`/history/tasks?limit=${limit}`)
}

export async function getBatchList() {
  if (isNative()) {
    const data = await (await getDb()).getBatchJobs()
    return { success: true, data }
  }
  return request<{ success: boolean; data: BatchJobStatus[] }>('/batch/list')
}

export function getBatchItemAudioUrl(jobId: string, itemIndex: number): string {
  return `${API_BASE}/batch/${jobId}/items/${itemIndex}/audio`
}

export async function getBatchItemAudioDataUrl(jobId: string, itemIndex: number): Promise<string> {
  if (isNative()) {
    const path = await (await getDb()).getBatchItemAudioPath(jobId, itemIndex)
    if (!path) return ''
    const format = path.split('.').pop() || 'wav'
    return (await getAudioStorage()).getAudioDataUrl(path, format)
  }
  return `${API_BASE}/batch/${jobId}/items/${itemIndex}/audio`
}

export async function getVersion() {
  if (isNative()) return { version: APP_VERSION }
  return request<{ version: string }>('/version')
}

export async function checkUpdate() {
  if (isNative()) return (await getMimoApi()).checkUpdateNative(APP_VERSION)
  return request<UpdateInfo>('/update/check')
}

export async function getProviders() {
  if (isNative()) {
    const data = await (await getDb()).getProviders()
    return { success: true, data }
  }
  return request<{ success: boolean; data: Provider[] }>('/config/providers')
}

export async function addProvider(name: string, apiKey: string, apiBase: string, models: ModelConfig[], isDefault: boolean) {
  if (isNative()) {
    await (await getDb()).addProvider(name, apiKey, apiBase, models, isDefault)
    scheduleBackgroundSync()
    return { success: true }
  }
  return request<{ success: boolean }>('/config/providers', {
    method: 'POST',
    body: JSON.stringify({ name, api_key: apiKey, api_base: apiBase, models, is_default: isDefault }),
  })
}

export async function updateProvider(id: string, name: string, apiKey: string, apiBase: string, models: ModelConfig[], isDefault: boolean) {
  if (isNative()) {
    await (await getDb()).updateProvider(id, name, apiKey, apiBase, models, isDefault)
    scheduleBackgroundSync()
    return { success: true }
  }
  return request<{ success: boolean }>(`/config/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, api_key: apiKey, api_base: apiBase, models, is_default: isDefault }),
  })
}

export async function deleteProvider(id: string) {
  if (isNative()) {
    await (await getDb()).deleteProvider(id)
    scheduleBackgroundSync()
    return { success: true }
  }
  return request<{ success: boolean }>(`/config/providers/${id}`, { method: 'DELETE' })
}

export async function testConnection(apiKey: string, apiBase: string) {
  if (isNative()) {
    try {
      const resp = await fetch(`${apiBase}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
      return { success: resp.ok, message: resp.ok ? '连接成功' : `连接失败: ${resp.status}` }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, message: `连接失败: ${message}` }
    }
  }
  return request<{ success: boolean; message: string }>('/config/test', {
    method: 'POST',
    body: JSON.stringify({ name: 'test', api_key: apiKey, api_base: apiBase, models: [] }),
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function getAudioDataUrlForHistory(audioPath: string, format: string): Promise<string> {
  if (isNative()) {
    return (await getAudioStorage()).getAudioDataUrl(audioPath, format)
  }
  return `${API_BASE}/history/${audioPath}/audio`
}

export async function deleteHistory(id: string) {
  if (isNative()) {
    await (await getDb()).deleteGeneration(id)
    return { success: true }
  }
  return request<{ success: boolean }>(`/history/${id}`, { method: 'DELETE' })
}
