import { useState } from 'react'
import TTSWorkbench from './pages/TTSWorkbench'
import VoiceClone from './pages/VoiceClone'
import VoiceDesign from './pages/VoiceDesign'
import BatchProcess from './pages/BatchProcess'
import History from './pages/History'

const tabs = [
  { id: 'tts', label: 'TTS 工作台', icon: '🎤' },
  { id: 'clone', label: '声音克隆', icon: '👤' },
  { id: 'design', label: '声音设计', icon: '🎨' },
  { id: 'batch', label: '批量处理', icon: '📦' },
  { id: 'history', label: '历史记录', icon: '📋' },
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
      default: return <TTSWorkbench />
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">MiMo TTS Studio</h1>
          <span className="text-sm text-slate-400">基于小米 MiMo TTS 系列模型</span>
        </div>
      </header>

      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-6xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
