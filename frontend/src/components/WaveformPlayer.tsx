import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { formatSeconds } from '../utils/audio'

interface WaveformPlayerProps {
  audioSrc: string
  height?: number
  showDownload?: boolean
  downloadFilename?: string
}

const WS_OPTIONS = {
  waveColor: '#c7d2fe',
  progressColor: '#6366f1',
  cursorColor: '#4f46e5',
  barWidth: 2,
  barGap: 1,
  barRadius: 2,
  normalize: true,
} as const

export default function WaveformPlayer({ audioSrc, height = 48, showDownload = false, downloadFilename = 'audio.wav' }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      ...WS_OPTIONS,
    })

    ws.load(audioSrc)

    ws.on('ready', () => {
      setReady(true)
      setDuration(formatSeconds(ws.getDuration()))
    })

    ws.on('audioprocess', () => {
      setCurrentTime(formatSeconds(ws.getCurrentTime()))
    })

    ws.on('finish', () => {
      setPlaying(false)
      setCurrentTime('0:00')
    })

    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))

    ws.on('error', (err: any) => {
      console.warn('WaveformPlayer error:', err)
    })

    wsRef.current = ws

    return () => {
      ws.destroy()
      wsRef.current = null
      // Revoke blob URLs to prevent memory leaks
      if (audioSrc.startsWith('blob:')) URL.revokeObjectURL(audioSrc)
    }
  }, [audioSrc, height])

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = audioSrc
    a.download = downloadFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [audioSrc, downloadFilename])

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 flex items-center justify-center shrink-0 transition-colors"
      >
        {playing ? (
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div ref={containerRef} className="w-full" />
      </div>
      <span className="text-[11px] text-gray-400 font-mono shrink-0">
        {currentTime} / {duration}
      </span>
      {showDownload && (
        <button
          onClick={handleDownload}
          className="shrink-0 text-gray-400 hover:text-indigo-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
      )}
    </div>
  )
}
