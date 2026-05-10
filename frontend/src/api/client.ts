const API_BASE = '/api'

export interface TTSRequest {
  text: string
  model?: string
  voice?: string
  format?: string
  speed?: number
  emotion?: string
}

export interface TTSResponse {
  success: boolean
  data?: {
    audio: string
    format: string
    generation_id: string
  }
  error?: { code: string; message: string }
}

export interface VoiceDesignRequest {
  description: string
  text: string
  format?: string
}

export interface BatchCreateRequest {
  name: string
  texts: string[]
  voice?: string
  model?: string
  format?: string
  speed?: number
}

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
  return request('/tts/synthesize', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function synthesizeStream(req: TTSRequest): Promise<ReadableStream> {
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
  const form = new FormData()
  form.append('audio', audioFile)
  form.append('text', text)
  if (format) form.append('format', format)
  if (emotion) form.append('emotion', emotion)

  const resp = await fetch(`${API_BASE}/clone/synthesize`, {
    method: 'POST',
    body: form,
  })
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
  const form = new FormData()
  form.append('audio', audioFile)
  form.append('name', name)

  const resp = await fetch(`${API_BASE}/clone/save`, {
    method: 'POST',
    body: form,
  })
  if (!resp.ok) throw new Error('Save voice failed')
  return resp.json()
}

export async function designVoice(req: VoiceDesignRequest): Promise<TTSResponse> {
  return request('/design/generate', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function createBatch(req: BatchCreateRequest) {
  return request<{ success: boolean; data: { job_id: string; total_items: number } }>(
    '/batch/create',
    { method: 'POST', body: JSON.stringify(req) }
  )
}

export async function getBatchStatus(jobId: string) {
  return request<{ success: boolean; data: any }>(`/batch/${jobId}/status`)
}

export async function getPresets() {
  return request<{ success: boolean; data: Array<{ id: string; name: string; style: string }> }>(
    '/voices/presets'
  )
}

export async function getModels() {
  return request<{ success: boolean; data: Array<{ id: string; name: string; type: string; provider?: string }> }>(
    '/config/models'
  )
}

export async function getHistory(page = 1, limit = 20) {
  return request<{ success: boolean; data: { items: any[]; total: number } }>(
    `/history?page=${page}&limit=${limit}`
  )
}

export async function getRecentTasks(limit = 20) {
  return request<{ success: boolean; data: any[] }>(
    `/history/tasks?limit=${limit}`
  )
}

export async function getBatchList() {
  return request<{ success: boolean; data: any[] }>('/batch/list')
}

export function getBatchItemAudioUrl(jobId: string, itemIndex: number): string {
  return `${API_BASE}/batch/${jobId}/items/${itemIndex}/audio`
}

export interface UpdateInfo {
  current: string
  latest: string
  has_update: boolean
  download_url: string | null
  release_notes: string | null
}

export async function getVersion() {
  return request<{ version: string }>('/version')
}

export async function checkUpdate() {
  return request<UpdateInfo>('/update/check')
}
