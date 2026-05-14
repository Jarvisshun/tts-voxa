import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  // Register jeep-sqlite web component (needed for both native and desktop)
  try {
    const { defineCustomElements } = await import('jeep-sqlite/loader')
    defineCustomElements(window)
    const el = document.createElement('jeep-sqlite')
    el.style.cssText = 'position:absolute;display:block;width:0;height:0'
    document.body.appendChild(el)
  } catch (e) {
    console.warn('jeep-sqlite load failed:', e)
  }

  // Initialize database (works on native via CapacitorSQLite, on desktop via jeep-sqlite/IndexedDB)
  try {
    const { initDatabase } = await import('./db/database')
    await initDatabase()
  } catch (e) {
    console.error('Database init failed, app will run without local DB:', e)
  }

  // Auto-sync with Supabase if configured (works on all platforms)
  try {
    const url = localStorage.getItem('supabase_url')
    const key = localStorage.getItem('supabase_key')
    if (url && key) {
      const { initSupabase } = await import('./api/supabase')
      initSupabase(url, key)
      const { syncAll } = await import('./db/sync')
      syncAll().catch(e => console.warn('Auto-sync failed:', e))
    }
  } catch (e) {
    console.warn('Supabase init failed:', e)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
