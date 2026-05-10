import { useState } from 'react'
import { TaskProvider } from './contexts/TaskContext'
import Sidebar from './components/Sidebar'
import TTSWorkbench from './pages/TTSWorkbench'
import VoiceClone from './pages/VoiceClone'
import VoiceDesign from './pages/VoiceDesign'
import BatchProcess from './pages/BatchProcess'
import History from './pages/History'
import Settings from './pages/Settings'

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
    <TaskProvider>
      <div className="h-screen flex flex-col bg-[#f8f9fc] overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-6 py-3 shrink-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm shadow-indigo-200">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900 tracking-tight">TTS Voxa</h1>
                <p className="text-[11px] text-gray-400 -mt-0.5">AI Voice Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">Ready</span>
            </div>
          </div>
        </header>

        {/* Sidebar + Main */}
        <div className="flex flex-1 min-h-0">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {renderPage()}
            </div>
          </main>
        </div>
      </div>
    </TaskProvider>
  )
}

export default App
