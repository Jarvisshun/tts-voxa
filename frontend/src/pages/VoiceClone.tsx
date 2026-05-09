import { useState, useRef, useEffect } from 'react'
import { cloneSynthesize, cloneSave } from '../api/client'

export default function VoiceClone() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [text, setText] = useState('你好，这是用克隆声音合成的语音。')
  const [emotion, setEmotion] = useState('')
  const [format, setFormat] = useState('wav')
  const [loading, setLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [error, setError] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      setSaved(false)
    }
  }

  const handleSynthesize = async () => {
    if (!audioFile || !text.trim()) return
    setLoading(true)
    setError('')
    setAudioSrc('')

    try {
      const resp = await cloneSynthesize(audioFile, text.trim(), format, emotion || undefined)
      if (resp.success && resp.data) {
        const audioUrl = `data:audio/${resp.data.format};base64,${resp.data.audio}`
        setAudioSrc(audioUrl)
      } else {
        setError('合成失败')
      }
    } catch (e: any) {
      setError(e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!audioFile || !saveName.trim()) return
    try {
      await cloneSave(audioFile, saveName.trim())
      setSaved(true)
    } catch (e: any) {
      setError(e.message || '保存失败')
    }
  }

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.load()
    }
  }, [audioSrc])

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">上传参考音频</h2>
        <div
          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {audioFile ? (
            <div>
              <div className="text-blue-400 text-2xl mb-2">🎵</div>
              <div className="text-slate-200">{audioFile.name}</div>
              <div className="text-xs text-slate-400 mt-1">
                {(audioFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div>
              <div className="text-slate-400 text-2xl mb-2">📁</div>
              <div className="text-slate-400">点击上传音频文件 (WAV/MP3)</div>
              <div className="text-xs text-slate-500 mt-1">最大 10MB</div>
            </div>
          )}
        </div>

        {audioFile && (
          <div className="mt-4">
            <div className="text-sm text-slate-400 mb-2">参考音频预览</div>
            <audio controls className="w-full">
              <source src={URL.createObjectURL(audioFile)} />
            </audio>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">情感风格</label>
            <input
              type="text"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="如: 开心、悲伤、激动"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">输出格式</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleSynthesize}
        disabled={loading || !audioFile || !text.trim()}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors"
      >
        {loading ? '正在合成...' : '克隆声音合成'}
      </button>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {audioSrc && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">合成结果</div>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioSrc} />
          </audio>
          <a
            href={audioSrc}
            download={`clone_output.${format}`}
            className="inline-block mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            下载音频
          </a>
        </div>
      )}

      {audioFile && (
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-2">保存到声音库</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="声音名称"
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-200"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded text-sm"
            >
              {saved ? '已保存 ✓' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
