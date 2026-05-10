import type { TTSRequest, TTSResponse, VoiceDesignRequest } from './types'
import { getProviderApiKey } from '../db/database'
import { saveAudio } from '../storage/audioStorage'

interface MiMoConfig {
  apiKey: string
  apiBase: string
}

async function getConfig(): Promise<MiMoConfig> {
  const provider = await getProviderApiKey()
  if (provider) return { apiKey: provider.api_key, apiBase: provider.api_base }
  return { apiKey: '', apiBase: 'https://token-plan-sgp.xiaomimimo.com/v1' }
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function tts(req: TTSRequest): Promise<{ audio: string; format: string }> {
  const { apiKey, apiBase } = await getConfig()
  const messages: Array<{ role: string; content: string }> = []
  if (req.emotion) messages.push({ role: 'user', content: `用${req.emotion}的语气说` })
  messages.push({ role: 'assistant', content: req.text })

  const payload = {
    model: req.model || 'mimo-v2.5-tts',
    messages,
    modalities: ['text', 'audio'],
    audio: { voice: req.voice || 'mimo_default', format: req.format || 'wav', speed: req.speed || 1.0 },
    stream: false,
  }

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`TTS API error: ${resp.status}`)
  const data = await resp.json()
  return {
    audio: data.choices[0].message.audio.data,
    format: req.format || 'wav',
  }
}

export async function* ttsStream(
  req: TTSRequest
): AsyncGenerator<{ type: string; data?: string }> {
  const { apiKey, apiBase } = await getConfig()
  const messages: Array<{ role: string; content: string }> = []
  if (req.emotion) messages.push({ role: 'user', content: `用${req.emotion}的语气说` })
  messages.push({ role: 'assistant', content: req.text })

  const payload = {
    model: req.model || 'mimo-v2.5-tts',
    messages,
    modalities: ['text', 'audio'],
    audio: { voice: req.voice || 'mimo_default', format: req.format || 'wav', speed: req.speed || 1.0 },
    stream: true,
  }

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`TTS stream API error: ${resp.status}`)

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const chunk = line.slice(6)
      if (chunk === '[DONE]') { yield { type: 'complete' }; return }
      try {
        const data = JSON.parse(chunk)
        const delta = data.choices?.[0]?.delta
        if (delta?.audio?.data) yield { type: 'audio_chunk', data: delta.audio.data }
      } catch { continue }
    }
  }
}

export async function voiceClone(
  text: string,
  audioBase64: string,
  audioFormat: string = 'wav',
  outputFormat: string = 'wav',
  emotion?: string
): Promise<{ audio: string; format: string }> {
  const { apiKey, apiBase } = await getConfig()
  const voiceDataUrl = `data:audio/${audioFormat};base64,${audioBase64}`

  const messages: Array<{ role: string; content: string }> = []
  messages.push({ role: 'user', content: emotion ? `用${emotion}的语气说` : 'clone' })
  messages.push({ role: 'assistant', content: text })

  const payload = {
    model: 'mimo-v2.5-tts-voiceclone',
    messages,
    modalities: ['text', 'audio'],
    audio: { voice: voiceDataUrl, format: outputFormat },
    stream: false,
  }

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Voice clone API error: ${resp.status}`)
  const data = await resp.json()
  return { audio: data.choices[0].message.audio.data, format: outputFormat }
}

export async function voiceDesign(
  req: VoiceDesignRequest
): Promise<{ audio: string; format: string }> {
  const { apiKey, apiBase } = await getConfig()
  const payload = {
    model: 'mimo-v2.5-tts-voicedesign',
    messages: [
      { role: 'user', content: req.description },
      { role: 'assistant', content: req.text },
    ],
    modalities: ['text', 'audio'],
    audio: { format: req.format || 'wav' },
    stream: false,
  }

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`Voice design API error: ${resp.status}`)
  const data = await resp.json()
  return { audio: data.choices[0].message.audio.data, format: req.format || 'wav' }
}

export async function synthesizeAndSave(req: TTSRequest): Promise<TTSResponse> {
  try {
    const result = await tts(req)
    const genId = `gen_${crypto.randomUUID().slice(0, 12)}`
    const audioPath = await saveAudio(result.audio, result.format, genId)
    const { insertGeneration } = await import('../db/database')
    await insertGeneration(genId, req.model || 'mimo-v2.5-tts', req.voice || 'mimo_default', req.text, audioPath, result.format, req.speed || 1.0, req.emotion || null)
    return { success: true, data: { audio: result.audio, format: result.format, generation_id: genId } }
  } catch (e: any) {
    return { success: false, error: { code: 'TTS_ERROR', message: e.message } }
  }
}

export async function cloneAndSave(
  audioBase64: string,
  audioFormat: string,
  text: string,
  outputFormat?: string,
  emotion?: string
): Promise<TTSResponse> {
  try {
    const result = await voiceClone(text, audioBase64, audioFormat, outputFormat || 'wav', emotion)
    const genId = `gen_${crypto.randomUUID().slice(0, 12)}`
    const audioPath = await saveAudio(result.audio, result.format, genId)
    const { insertGeneration } = await import('../db/database')
    await insertGeneration(genId, 'mimo-v2.5-tts-voiceclone', 'clone', text, audioPath, result.format, 1.0, emotion || null)
    return { success: true, data: { audio: result.audio, format: result.format, generation_id: genId } }
  } catch (e: any) {
    return { success: false, error: { code: 'CLONE_ERROR', message: e.message } }
  }
}

export async function designAndSave(req: VoiceDesignRequest): Promise<TTSResponse> {
  try {
    const result = await voiceDesign(req)
    const genId = `gen_${crypto.randomUUID().slice(0, 12)}`
    const audioPath = await saveAudio(result.audio, result.format, genId)
    const { insertGeneration } = await import('../db/database')
    await insertGeneration(genId, 'mimo-v2.5-tts-voicedesign', 'design', req.text, audioPath, result.format, 1.0, null)
    return { success: true, data: { audio: result.audio, format: result.format, generation_id: genId } }
  } catch (e: any) {
    return { success: false, error: { code: 'DESIGN_ERROR', message: e.message } }
  }
}

const GITHUB_REPO = 'Jarvisshun/tts-voxa'

export async function checkUpdateNative(currentVersion: string): Promise<import('./types').UpdateInfo> {
  const result: import('./types').UpdateInfo = {
    current: currentVersion,
    latest: currentVersion,
    has_update: false,
    download_url: null,
    release_notes: null,
  }
  try {
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github+json' },
    })
    if (resp.status === 200) {
      const data = await resp.json()
      const tag = data.tag_name || ''
      const latestVer = tag.replace(/^v/, '')
      let downloadUrl: string | null = null
      for (const asset of data.assets || []) {
        if (asset.name?.endsWith('.apk')) { downloadUrl = asset.browser_download_url; break }
      }
      if (!downloadUrl) downloadUrl = data.html_url || ''
      result.latest = latestVer
      result.has_update = parseVersion(latestVer) > parseVersion(currentVersion)
      result.download_url = downloadUrl
      result.release_notes = data.body || ''
    }
  } catch {
    result.error = '检查失败，请稍后重试'
  }
  return result
}

function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(p => parseInt(p) || 0)
}
