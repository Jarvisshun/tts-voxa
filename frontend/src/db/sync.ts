import { isSupabaseReady, getCurrentUser, pushVoices, pushGenerations, pushBatchJobs, pushBatchItems, pushProviders, pullVoices, pullGenerations, pullBatchJobs, pullBatchItems, pullProviders } from '../api/supabase'

// Offline-first sync engine
// All reads/writes go to local SQLite first (fast, works offline)
// Background sync pushes local changes to Supabase
// Pulls remote changes to local on app open

let syncInProgress = false
let syncQueued = false

export function isSyncing(): boolean {
  return syncInProgress
}

// Pull remote data and merge into local (last-write-wins by updated_at)
export async function pullFromCloud(): Promise<void> {
  if (!isSupabaseReady()) return
  const user = await getCurrentUser()
  if (!user) return

  try {
    const [remoteVoices, remoteGenerations, remoteBatchJobs, remoteBatchItems, remoteProviders] = await Promise.all([
      pullVoices(user.id),
      pullGenerations(user.id),
      pullBatchJobs(user.id),
      pullBatchItems(user.id),
      pullProviders(user.id),
    ])

    // Dynamic import to avoid loading on web
    const { isNative } = await import('../platform')
    if (!isNative()) return

    const db = await import('./database')

    // Merge voices: insert/update from remote
    for (const voice of remoteVoices) {
      try {
        await db.saveVoice(
          voice.id as string,
          voice.name as string,
          voice.type as string,
          (voice.voice_id as string) || '',
          (voice.description as string) || '',
          (voice.audio_path as string) || ''
        )
      } catch (e) {
        console.warn('Merge voice failed:', e)
      }
    }

    // Merge generations: insert if not exists locally
    for (const gen of remoteGenerations) {
      try {
        await db.insertGeneration(
          gen.id as string,
          gen.model as string,
          (gen.voice as string) || '',
          gen.text_content as string,
          gen.audio_path as string,
          (gen.format as string) || 'wav',
          (gen.speed as number) || 1.0,
          (gen.emotion as string) || null
        )
      } catch {
        // Already exists locally — skip
      }
    }

    // Merge batch jobs
    for (const job of remoteBatchJobs) {
      try {
        await db.upsertBatchJob(job)
      } catch (e) {
        console.warn('Merge batch job failed:', e)
      }
    }

    // Merge batch items
    for (const item of remoteBatchItems) {
      try {
        await db.upsertBatchItem(item)
      } catch (e) {
        console.warn('Merge batch item failed:', e)
      }
    }

    // Merge providers
    for (const provider of remoteProviders) {
      try {
        await db.upsertProvider(provider)
      } catch (e) {
        console.warn('Merge provider failed:', e)
      }
    }
  } catch (e) {
    console.error('Pull from cloud failed:', e)
  }
}

// Push local unsynced data to Supabase
export async function pushToCloud(): Promise<void> {
  if (!isSupabaseReady()) return
  const user = await getCurrentUser()
  if (!user) return

  try {
    const { isNative } = await import('../platform')
    if (!isNative()) return

    const db = await import('./database')

    // Get all local data (we push everything since we track by updated_at)
    const [localVoices, localGenerations, localBatchJobs, localBatchItems, localProviders] = await Promise.all([
      db.getVoices(),
      db.getHistory(1, 1000),
      db.getBatchJobs(),
      db.getAllBatchItems(),
      db.getProviders(),
    ])

    await Promise.all([
      pushVoices(user.id, localVoices),
      pushGenerations(user.id, localGenerations.items || []),
      pushBatchJobs(user.id, localBatchJobs),
      pushBatchItems(user.id, localBatchItems),
      pushProviders(user.id, localProviders),
    ])
  } catch (e) {
    console.error('Push to cloud failed:', e)
  }
}

// Full sync: push then pull
export async function syncAll(): Promise<void> {
  if (syncInProgress) {
    syncQueued = true
    return
  }

  syncInProgress = true
  try {
    await pushToCloud()
    await pullFromCloud()
  } finally {
    syncInProgress = false
    if (syncQueued) {
      syncQueued = false
      // Debounce: wait a bit before re-syncing
      setTimeout(() => syncAll(), 5000)
    }
  }
}

// Background sync — called after local writes, debounced
let syncTimeout: ReturnType<typeof setTimeout> | null = null
export function scheduleBackgroundSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    syncAll().catch(e => console.warn('Background sync failed:', e))
  }, 10000) // 10s debounce
}
