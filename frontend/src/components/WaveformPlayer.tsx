import { useEffect, useRef, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { formatSeconds, dataUrlToBase64, bytesToBase64 } from '../utils/audio'
import { isNative } from '../platform'

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
  const [downloading, setDownloading] = useState(false)

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
    }
  }, [audioSrc, height])

  const togglePlay = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      if (isNative()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const writeToCacheAndOpen = async (base64: string) => {
          await Filesystem.writeFile({ path: downloadFilename, data: base64, directory: Directory.Cache })
          const uri = await Filesystem.getUri({ path: downloadFilename, directory: Directory.Cache })
          window.open(uri.uri, '_system')
        }
        const parsed = dataUrlToBase64(audioSrc)
        if (parsed) {
          await writeToCacheAndOpen(parsed.base64)
        } else {
          const resp = await fetch(audioSrc)
          if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
          const blob = await resp.blob()
          const bytes = new Uint8Array(await blob.arrayBuffer())
          await writeToCacheAndOpen(bytesToBase64(bytes))
        }
      } else {
        // Desktop: fetch → blob → download via <a> click
        const resp = await fetch(audioSrc)
        if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadFilename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.warn('Download failed, trying fallback:', e)
      // Fallback: direct <a> download
      const a = document.createElement('a')
      a.href = audioSrc
      a.download = downloadFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
    }
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
          disabled={downloading}
          className="shrink-0 text-gray-400 hover:text-indigo-500 disabled:text-gray-200 transition-colors"
        >
          {downloading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
