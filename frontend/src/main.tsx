import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNative } from './platform'

async function bootstrap() {
  if (isNative()) {
    // Register jeep-sqlite web component from local package (not CDN — CDN blocked in China)
    try {
      const { applyPolyfills, defineCustomElements } = await import('jeep-sqlite/loader')
      await applyPolyfills()
      defineCustomElements(window)
      const el = document.createElement('jeep-sqlite')
      el.style.cssText = 'position:absolute;display:block;width:0;height:0'
      document.body.appendChild(el)
    } catch (e) {
      console.warn('jeep-sqlite load failed:', e)
    }

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
