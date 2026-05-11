import { Filesystem, Directory } from '@capacitor/filesystem'
import { isNative } from '../platform'
import { base64ToBytes } from '../utils/audio'

const AUDIO_DIR = 'audio_store'

async function ensureDir() {
  try {
    await Filesystem.mkdir({ path: AUDIO_DIR, directory: Directory.Data, recursive: true })
  } catch (e) { console.warn('ensureDir failed:', e) }
}

export async function saveAudio(audioBase64: string, format: string, prefix: string): Promise<string> {
  if (!isNative()) return `${prefix}.${format}`
  await ensureDir()
  const filename = `${prefix}.${format}`
  await Filesystem.writeFile({
    path: `${AUDIO_DIR}/${filename}`,
    data: audioBase64,
    directory: Directory.Data,
  })
  return filename
}

export async function readAudioBase64(filename: string): Promise<string> {
  const result = await Filesystem.readFile({
    path: `${AUDIO_DIR}/${filename}`,
    directory: Directory.Data,
  })
  return result.data as string
}

export async function getAudioDataUrl(filename: string, format: string): Promise<string> {
  const b64 = await readAudioBase64(filename)
  // Convert base64 to blob URL — more reliable than data URL for WaveSurfer on Android WebView
  try {
    const bytes = base64ToBytes(b64)
    const mime = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`
    const blob = new Blob([bytes], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    // Fallback to data URL if blob creation fails
    return `data:audio/${format};base64,${b64}`
  }
}

export async function deleteAudioFile(filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: `${AUDIO_DIR}/${filename}`, directory: Directory.Data })
  } catch {}
}

export async function downloadApk(url: string, onProgress?: (percent: number) => void): Promise<void> {
  // Try direct download with redirect follow
  let resp: Response
  try {
    resp = await fetch(url, { redirect: 'follow', mode: 'cors' })
  } catch {
    // Fallback: try without cors
    try {
      resp = await fetch(url, { redirect: 'follow' })
    } catch {
      // Last resort: open in browser for manual download
      window.open(url, '_system')
      throw new Error('无法直接下载，已在浏览器中打开下载页面')
    }
  }

  if (!resp.ok) throw new Error(`下载失败: ${resp.status}`)
  if (!resp.body) throw new Error('下载响应为空')

  const total = parseInt(resp.headers.get('content-length') || '0')
  const reader = resp.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (total > 0 && onProgress) onProgress(Math.round((received / total) * 100))
  }

  const blob = new Blob(chunks as BlobPart[])
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  const filename = 'TTS-Voxa-update.apk'
  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  })

  const uri = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
  window.open(uri.uri, '_system')
}
