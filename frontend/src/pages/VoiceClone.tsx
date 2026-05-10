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
    <div className="space-y-5">
      {/* Upload */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-slate-300 mb-4">上传参考音频</h2>
        <div
          className="border-2 border-dashed border-slate-600/50 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
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
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎵</span>
              </div>
              <div className="text-slate-200 font-medium truncate max-w-xs mx-auto">{audioFile.name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {(audioFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-slate-500">📁</span>
              </div>
              <div className="text-slate-400 text-sm">点击上传音频文件</div>
              <div className="text-[11px] text-slate-600 mt-1">WAV / MP3，最大 10MB</div>
            </div>
          )}
        </div>

        {audioFile && (
          <div className="mt-4">
            <div className="text-xs text-slate-500 mb-2">参考音频预览</div>
            <audio controls className="w-full">
              <source src={URL.createObjectURL(audioFile)} />
            </audio>
          </div>
        )}
      </div>

      {/* Text + Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="block text-sm font-medium text-slate-300 mb-3">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">情感风格</label>
            <input
              type="text"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="如: 开心、悲伤、激动"
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">输出格式</label>
            <div className="flex gap-1">
              {['wav', 'mp3'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-blue-600/80 text-white shadow-sm'
                      : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Synthesize Button */}
      <button
        onClick={handleSynthesize}
        disabled={loading || !audioFile || !text.trim()}
        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-2xl font-medium text-sm transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '正在合成...' : '克隆声音合成'}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {audioSrc && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">合成结果</span>
            <a href={audioSrc} download={`clone_output.${format}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              下载 .{format}
            </a>
          </div>
          <audio ref={audioRef} controls className="w-full">
            <source src={audioSrc} />
          </audio>
        </div>
      )}

      {/* Save to Library */}
      {audioFile && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
          <div className="text-sm text-slate-400 mb-3">保存到声音库</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="声音名称"
              className="flex-1 bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-5 py-2.5 bg-emerald-600/80 hover:bg-emerald-500/80 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-sm font-medium transition-all"
            >
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
