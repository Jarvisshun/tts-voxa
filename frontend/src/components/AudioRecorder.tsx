import { useState, useRef, useEffect, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { blobToWavFile, base64ToBytes, formatSeconds } from '../utils/audio'
import { isNative } from '../platform'

interface AudioRecorderProps {
  onRecorded: (file: File) => void
}

type RecorderState = 'idle' | 'starting' | 'recording' | 'recorded'

// Lazy-load the custom microphone plugin (for native Android)
let TtsVoxaMic: any = null
async function getTtsVoxaMic() {
  if (!TtsVoxaMic) {
    const mod = await import('../plugins/ttsVoxaMicrophone')
    TtsVoxaMic = mod.default
  }
  return TtsVoxaMic
}

export default function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const cancelAnimRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isNative()) return

    const enumDevices = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        tempStream.getTracks().forEach(t => t.stop())
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput')
        setDevices(audioInputs)
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId)
        }
      } catch {
        setError('无法访问麦克风，请检查浏览器权限')
      }
    }
    enumDevices()
  }, [])

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = '#f8f9fc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = '#6366f1'
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
  }, [])

  // Animated bars for native (no real-time audio data available)
  const drawNativeWaveform = useCallback(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bars = 40
    const barWidth = canvas.width / bars - 2
    const supportsRoundRect = typeof ctx.roundRect === 'function'
    let phase = 0
    let cancelled = false

    const draw = () => {
      if (cancelled) return
      animFrameRef.current = requestAnimationFrame(draw)
      ctx.fillStyle = '#f8f9fc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      phase += 0.15
      ctx.fillStyle = '#6366f1'
      for (let i = 0; i < bars; i++) {
        const h = (Math.sin(phase + i * 0.3) * 0.3 + 0.5) * canvas.height * 0.6
        const x = i * (barWidth + 2)
        const y = (canvas.height - h) / 2

        ctx.beginPath()
        if (supportsRoundRect) {
          ctx.roundRect(x, y, barWidth, h, 2)
        } else {
          ctx.rect(x, y, barWidth, h)
        }
        ctx.fill()
      }
    }
    draw()
    return () => { cancelled = true }
  }, [])

  // --- Native recording using custom TtsVoxaMicrophone plugin ---
  const startRecordingNative = async () => {
    setState('starting')
    setError('')
    try {
      const mic = await getTtsVoxaMic()

      // Check permission
      let permResult = await mic.checkMicPermission()
      if (!permResult.granted) {
        permResult = await mic.requestMicPermission()
      }
      if (!permResult.granted) {
        setError('麦克风权限被拒绝，请在系统设置中允许 TTS Voxa 使用麦克风')
        setState('idle')
        return
      }

      // Start recording with timeout to prevent hanging
      const startPromise = mic.startMicRecording()
      let timeoutTimer: ReturnType<typeof setTimeout>
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => reject(new Error('录音启动超时，请重试')), 10000)
      })
      await Promise.race([startPromise, timeoutPromise]).finally(() => clearTimeout(timeoutTimer))

      setState('recording')
      setDuration(0)

      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      cancelAnimRef.current = drawNativeWaveform() ?? null
    } catch (e: any) {
      setState('idle')
      setError(e.message || '录音启动失败')
    }
  }

  const stopRecordingNative = async () => {
    try {
      const mic = await getTtsVoxaMic()
      const result = await mic.stopMicRecording()

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (cancelAnimRef.current) { cancelAnimRef.current(); cancelAnimRef.current = null }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

      if (result.base64) {
        const bytes = base64ToBytes(result.base64)
        const blob = new Blob([bytes], { type: 'audio/aac' })
        blobRef.current = blob
      }

      setState('recorded')
    } catch (e: any) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (cancelAnimRef.current) { cancelAnimRef.current(); cancelAnimRef.current = null }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setState('idle')
      setError(e.message || '录音停止失败')
    }
  }

  // --- Web recording using getUserMedia + MediaRecorder ---
  const startRecordingWeb = async () => {
    setState('starting')
    setError('')
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob

        if (waveformRef.current) {
          if (wsRef.current) { wsRef.current.destroy(); wsRef.current = null }
          waveformRef.current.innerHTML = ''
          const ws = WaveSurfer.create({
            container: waveformRef.current,
            height: 48,
            waveColor: '#c7d2fe',
            progressColor: '#6366f1',
            cursorColor: '#4f46e5',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            normalize: true,
          })
          const url = URL.createObjectURL(blob)
          ws.load(url)
          ws.on('ready', () => URL.revokeObjectURL(url))
          wsRef.current = ws
        }

        stream.getTracks().forEach(t => t.stop())
        audioContext.close()
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setState('recording')
      setDuration(0)

      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      drawWaveform()
    } catch (e: any) {
      setState('idle')
      if (e.name === 'NotAllowedError') {
        setError('麦克风访问被拒绝，请在浏览器设置中允许访问')
      } else if (e.name === 'NotFoundError') {
        setError('未找到麦克风设备')
      } else if (e.name === 'NotReadableError') {
        setError('麦克风被其他应用占用，请关闭其他录音应用后重试')
      } else {
        setError(e.message || '录音启动失败')
      }
    }
  }

  const stopRecordingWeb = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setState('recorded')
  }

  const startRecording = () => isNative() ? startRecordingNative() : startRecordingWeb()
  const stopRecording = () => isNative() ? stopRecordingNative() : stopRecordingWeb()

  const handleUseRecording = async () => {
    if (!blobRef.current) return
    try {
      if (isNative()) {
        // Native plugin returns m4a/AAC — send directly
        const ext = blobRef.current.type.includes('aac') || blobRef.current.type.includes('mp4') ? 'm4a' : 'wav'
        const file = new File([blobRef.current], `recording.${ext}`, { type: blobRef.current.type })
        onRecorded(file)
      } else {
        const wavFile = await blobToWavFile(blobRef.current)
        onRecorded(wavFile)
      }
    } catch {
      setError('音频转换失败')
    }
  }

  const handleRerecord = () => {
    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }
    blobRef.current = null
    setState('idle')
    setDuration(0)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (cancelAnimRef.current) cancelAnimRef.current()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioContextRef.current) audioContextRef.current.close()
      if (wsRef.current) wsRef.current.destroy()
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Device Selector (web only) */}
      {!isNative() && state === 'idle' && devices.length > 1 && (
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">录音设备</label>
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none truncate"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `麦克风 ${d.deviceId.slice(0, 4)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Real-time Waveform (during recording) */}
      {state === 'recording' && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="w-full h-20 rounded-xl border border-gray-200"
          />
          <div className="absolute top-2 right-3 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-500">{formatSeconds(duration)}</span>
          </div>
        </div>
      )}

      {/* Post-recording Waveform */}
      {state === 'recorded' && (
        <div className="space-y-3">
          <div ref={waveformRef} className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50/80" />
          <div className="text-xs text-gray-400 text-center">录音时长: {formatSeconds(duration)}</div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {(state === 'idle' || state === 'starting') && (
          <button
            onClick={startRecording}
            disabled={state !== 'idle'}
            className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 rounded-xl font-medium text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {state === 'starting' ? '正在启动...' : '开始录音'}
          </button>
        )}
        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl font-medium text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            停止录音
          </button>
        )}
        {state === 'recorded' && (
          <>
            <button
              onClick={handleRerecord}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-sm text-gray-600 transition-all"
            >
              重新录制
            </button>
            <button
              onClick={handleUseRecording}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-xl font-medium text-sm text-white transition-all shadow-sm"
            >
              使用此录音
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-600 text-xs flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
