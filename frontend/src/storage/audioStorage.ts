import { Filesystem, Directory } from '@capacitor/filesystem'
import { isNative } from '../platform'

const AUDIO_DIR = 'audio_store'

async function ensureDir() {
  try {
    await Filesystem.mkdir({ path: AUDIO_DIR, directory: Directory.Data, recursive: true })
  } catch {}
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
  return `data:audio/${format};base64,${b64}`
}

export async function deleteAudioFile(filename: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: `${AUDIO_DIR}/${filename}`, directory: Directory.Data })
  } catch {}
}

export async function downloadApk(url: string, onProgress?: (percent: number) => void): Promise<void> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
  const total = parseInt(resp.headers.get('content-length') || '0')
  const reader = resp.body!.getReader()
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

  // Open APK with system installer
  window.open(uri.uri, '_system')
}
