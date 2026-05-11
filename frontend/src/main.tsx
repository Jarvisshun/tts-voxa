import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNative } from './platform'

async function bootstrap() {
  if (isNative()) {
    // Load jeep-sqlite web component (required by @capacitor-community/sqlite on web/native)
    await new Promise<void>((resolve) => {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = 'https://unpkg.com/jeep-sqlite@2.0.0/dist/jeep-sqlite/jeep-sqlite.esm.js'
      script.onload = () => {
        // Register the jeep-sqlite web component
        const el = document.createElement('jeep-sqlite')
        el.style.cssText = 'position:absolute;display:block;width:0;height:0'
        document.body.appendChild(el)
        resolve()
      }
      script.onerror = () => resolve() // non-fatal, will fail in database.ts
      document.head.appendChild(script)
    })

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
