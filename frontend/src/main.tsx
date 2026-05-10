import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNative } from './platform'

async function bootstrap() {
  if (isNative()) {
    const { initDatabase } = await import('./db/database')
    await initDatabase()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
