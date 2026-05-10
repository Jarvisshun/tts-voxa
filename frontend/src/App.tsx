import { useState } from 'react'
import TTSWorkbench from './pages/TTSWorkbench'
import VoiceClone from './pages/VoiceClone'
import VoiceDesign from './pages/VoiceDesign'
import BatchProcess from './pages/BatchProcess'
import History from './pages/History'
import Settings from './pages/Settings'

const tabs = [
  { id: 'tts', label: 'TTS 工作台', icon: '🎤' },
  { id: 'clone', label: '声音克隆', icon: '👤' },
  { id: 'design', label: '声音设计', icon: '🎨' },
  { id: 'batch', label: '批量处理', icon: '📦' },
  { id: 'history', label: '历史记录', icon: '📋' },
  { id: 'settings', label: '设置', icon: '⚙️' },
]

function App() {
  const [activeTab, setActiveTab] = useState('tts')

  const renderPage = () => {
    switch (activeTab) {
      case 'tts': return <TTSWorkbench />
      case 'clone': return <VoiceClone />
      case 'design': return <VoiceDesign />
      case 'batch': return <BatchProcess />
      case 'history': return <History />
      case 'settings': return <Settings />
      default: return <TTSWorkbench />
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 px-6 py-4 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">TTS Studio</h1>
              <p className="text-[11px] text-slate-500 -mt-0.5">Multi-Model Voice Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Ready</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900/80 border-b border-slate-700/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
