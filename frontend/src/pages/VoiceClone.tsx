import { useState, useRef, useMemo, useEffect } from 'react'
import { cloneSynthesize, cloneSave } from '../api/client'
import { useTasks } from '../contexts/TaskContext'
import WaveformPlayer from '../components/WaveformPlayer'
import AudioRecorder from '../components/AudioRecorder'

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
  const [inputMode, setInputMode] = useState<'upload' | 'record'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  const previewUrl = useMemo(() => audioFile ? URL.createObjectURL(audioFile) : '', [audioFile])
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      setSaved(false)
    }
  }

  const { addTask, updateTask } = useTasks()

  const handleSynthesize = async () => {
    if (!audioFile || !text.trim()) return
    setLoading(true)
    setError('')
    setAudioSrc('')

    const taskId = `clone_${crypto.randomUUID().slice(0, 12)}`
    addTask({
      id: taskId,
      type: 'clone',
      status: 'running',
      textPreview: text.trim().slice(0, 30) + (text.trim().length > 30 ? '...' : ''),
      createdAt: new Date().toISOString(),
    })

    try {
      const resp = await cloneSynthesize(audioFile, text.trim(), format, emotion || undefined)
      if (resp.success && resp.data) {
        const audioUrl = `data:audio/${resp.data.format};base64,${resp.data.audio}`
        setAudioSrc(audioUrl)
        updateTask(taskId, { status: 'completed' })
      } else {
        setError('合成失败')
        updateTask(taskId, { status: 'failed' })
      }
    } catch (e: any) {
      setError(e.message || '请求失败')
      updateTask(taskId, { status: 'failed' })
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

  return (
    <div className="space-y-4">
      {/* Upload / Record */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">参考音频</h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                inputMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              上传文件
            </button>
            <button
              onClick={() => setInputMode('record')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                inputMode === 'record' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              现场录制
            </button>
          </div>
        </div>

        {inputMode === 'upload' ? (
          <>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
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
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  </div>
                  <div className="text-gray-800 font-medium truncate max-w-xs mx-auto">{audioFile.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {(audioFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="text-gray-500 text-sm">点击上传音频文件</div>
                  <div className="text-[11px] text-gray-400 mt-1">WAV / MP3，最大 10MB</div>
                </div>
              )}
            </div>
            {audioFile && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2 font-medium">参考音频预览</div>
                <WaveformPlayer audioSrc={previewUrl} height={40} />
              </div>
            )}
          </>
        ) : (
          <AudioRecorder onRecorded={(file) => { setAudioFile(file); setSaved(false) }} />
        )}
      </div>

      {/* Text + Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-3">合成文本</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">情感风格</label>
            <input
              type="text"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="如: 开心、悲伤、激动"
              className="w-full bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">输出格式</label>
            <div className="flex gap-1.5">
              {['wav', 'mp3'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    format === f
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200/70'
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
        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 rounded-2xl font-medium text-sm text-white transition-all shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50 disabled:shadow-none active:scale-[0.99]"
      >
        {loading ? '正在合成...' : '克隆声音合成'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      {/* Result */}
      {audioSrc && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">合成结果</span>
          </div>
          <WaveformPlayer audioSrc={audioSrc} showDownload downloadFilename={`clone_output.${format}`} />
        </div>
      )}

      {/* Save to Library */}
      {audioFile && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-medium text-gray-700 mb-3">保存到声音库</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="声音名称"
              className="flex-1 bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-sm font-medium text-white transition-all shadow-sm"
            >
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
