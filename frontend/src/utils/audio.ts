export async function blobToWavFile(blob: Blob, filename: string = 'recording.wav'): Promise<File> {
  const audioContext = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitsPerSample = 16

  const samples = audioBuffer.length
  const byteRate = sampleRate * numChannels * bitsPerSample / 8
  const blockAlign = numChannels * bitsPerSample / 8
  const dataSize = samples * blockAlign
  const bufferSize = 44 + dataSize

  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Interleave channels and write PCM data
  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch))
  }

  let offset = 44
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  await audioContext.close()
  return new File([buffer], filename, { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
