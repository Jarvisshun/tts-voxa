import { useState, useRef, useEffect, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { blobToWavFile } from '../utils/audio'
import { isNative } from '../platform'

// Polyfill navigator.mediaDevices for Android WebView (non-secure context)
if (isNative() && !navigator.mediaDevices) {
  (navigator as any).mediaDevices = {}
}
if (isNative() && !navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      const nav = navigator as any
      const fn = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia
      if (!fn) return reject(new Error('getUserMedia not supported'))
      fn.call(nav, constraints, resolve, reject)
    })
}
if (isNative() && !navigator.mediaDevices.enumerateDevices) {
  navigator.mediaDevices.enumerateDevices = () =>
    new Promise<MediaDeviceInfo[]>((resolve) => {
      const nav = navigator as any
      if (nav.mediaDevices?.enumerateDevices) {
        nav.mediaDevices.enumerateDevices().then(resolve)
      } else {
        resolve([])
      }
    })
}

interface AudioRecorderProps {
  onRecorded: (file: File) => void
}

type RecorderState = 'idle' | 'starting' | 'recording' | 'recorded'

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

  // Enumerate audio input devices
  useEffect(() => {
    const enumDevices = async () => {
      try {
        // Request permission first to get labeled devices
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        tempStream.getTracks().forEach(t => t.stop())

        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput')
        setDevices(audioInputs)
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId)
        }
      } catch {
        setError(isNative() ? '无法访问麦克风，请在系统设置中允许录音权限' : '无法访问麦克风，请检查浏览器权限')
      }
    }
    enumDevices()
  }, [])

  // Draw real-time waveform on canvas
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

  const startRecording = async () => {
    if (state !== 'idle') return
    setState('starting')
    setError('')
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Set up analyser for real-time visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      // Start MediaRecorder
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

        // Create wavesurfer for playback
        if (waveformRef.current) {
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
          wsRef.current = ws
        }

        // Stop all tracks
        stream.getTracks().forEach(t => t.stop())
        audioContext.close()
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setState('recording')
      setDuration(0)

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      // Start waveform drawing
      drawWaveform()
    } catch (e: any) {
      setState('idle')
      if (e.name === 'NotAllowedError') {
        setError(isNative() ? '麦克风权限被拒绝，请在系统设置中允许 TTS Voxa 使用麦克风' : '麦克风访问被拒绝，请在浏览器设置中允许访问')
      } else if (e.name === 'NotFoundError') {
        setError('未找到麦克风设备')
      } else {
        setError(e.message || '录音启动失败')
      }
    }
  }

  const stopRecording = () => {
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

  const handleUseRecording = async () => {
    if (!blobRef.current) return
    try {
      const wavFile = await blobToWavFile(blobRef.current)
      onRecorded(wavFile)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (wsRef.current) wsRef.current.destroy()
    }
  }, [])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Device Selector */}
      {state === 'idle' && devices.length > 1 && (
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
            <span className="text-xs font-mono text-red-500">{formatDuration(duration)}</span>
          </div>
        </div>
      )}

      {/* Post-recording Waveform */}
      {state === 'recorded' && (
        <div className="space-y-3">
          <div ref={waveformRef} className="w-full rounded-xl border border-gray-200 p-3 bg-gray-50/80" />
          <div className="text-xs text-gray-400 text-center">录音时长: {formatDuration(duration)}</div>
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
