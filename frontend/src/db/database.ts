import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { isNative } from '../platform'
import { SCHEMA_SQL } from './schema'

const DB_NAME = 'tts_voxa'
let db: SQLiteDBConnection | null = null
let initialized = false

function sanitizeRows(values: any[] | undefined): any[] {
  if (!values) return []
  return values.map(row => {
    const plain: Record<string, any> = {}
    for (const key of Object.keys(row)) {
      plain[key] = row[key]
    }
    return plain
  })
}

export async function initDatabase(): Promise<void> {
  if (!isNative()) return
  if (initialized) return
  try {
    const sqlite = new SQLiteConnection(CapacitorSQLite)
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result
    if (isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false)
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
    }
    await db.open()
    for (const sql of SCHEMA_SQL) {
      await db.execute(sql)
    }
    initialized = true
  } catch (e) {
    console.error('Database init failed:', e)
    throw e
  }
}

async function getDb(): Promise<SQLiteDBConnection> {
  if (!db) {
    if (isNative() && !initialized) {
      await initDatabase()
      if (db) return db
    }
    throw new Error('Database not initialized')
  }
  return db
}

function genId(): string {
  try {
    return `id_${crypto.randomUUID().slice(0, 12)}`
  } catch {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

// === Providers ===

export async function getProviderApiKey(): Promise<{ api_key: string; api_base: string } | null> {
  try {
    const d = await getDb()
    const res = await d.query('SELECT api_key, api_base FROM providers WHERE is_default = 1 LIMIT 1')
    const rows = sanitizeRows(res.values)
    return rows[0] || null
  } catch (e) {
    console.error('getProviderApiKey error:', e)
    return null
  }
}

export async function getProviders(): Promise<any[]> {
  try {
    const d = await getDb()
    const res = await d.query('SELECT * FROM providers ORDER BY is_default DESC, created_at DESC')
    return sanitizeRows(res.values).map(row => {
      // Parse models field from JSON string to array
      let models = row.models
      if (typeof models === 'string') {
        try { models = JSON.parse(models) } catch { models = [] }
      }
      if (!Array.isArray(models)) models = []
      // Ensure is_default is boolean
      const isDefault = row.is_default === 1 || row.is_default === true
      return { ...row, models, is_default: isDefault }
    })
  } catch (e) {
    console.error('getProviders error:', e)
    return []
  }
}

export async function addProvider(name: string, apiKey: string, apiBase: string, models: any[], isDefault: boolean): Promise<void> {
  const d = await getDb()
  const id = genId()
  try {
    if (isDefault) {
      await d.run('UPDATE providers SET is_default = 0')
    }
  } catch (e) {
    console.error('addProvider update error:', e)
  }
  await d.run(
    'INSERT INTO providers (id, name, api_key, api_base, models, is_default) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, apiKey, apiBase, JSON.stringify(models), isDefault ? 1 : 0]
  )
}

export async function updateProvider(id: string, name: string, apiKey: string, apiBase: string, models: any[], isDefault: boolean): Promise<void> {
  const d = await getDb()
  try {
    if (isDefault) {
      await d.run('UPDATE providers SET is_default = 0')
    }
  } catch (e) {
    console.error('updateProvider update error:', e)
  }
  if (apiKey) {
    await d.run(
      'UPDATE providers SET name = ?, api_key = ?, api_base = ?, models = ?, is_default = ? WHERE id = ?',
      [name, apiKey, apiBase, JSON.stringify(models), isDefault ? 1 : 0, id]
    )
  } else {
    await d.run(
      'UPDATE providers SET name = ?, api_base = ?, models = ?, is_default = ? WHERE id = ?',
      [name, apiBase, JSON.stringify(models), isDefault ? 1 : 0, id]
    )
  }
}

export async function deleteProvider(id: string): Promise<void> {
  const d = await getDb()
  await d.run('DELETE FROM providers WHERE id = ?', [id])
}

// === Generations (History) ===

export async function insertGeneration(
  id: string, model: string, voice: string, textContent: string,
  audioPath: string, format: string, speed: number, emotion: string | null
): Promise<void> {
  try {
    const d = await getDb()
    await d.run(
      'INSERT INTO generations (id, model, voice, text_content, audio_path, format, speed, emotion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, model, voice, textContent, audioPath, format, speed, emotion]
    )
  } catch (e) {
    console.error('insertGeneration error:', e)
  }
}

export async function getHistory(page: number = 1, limit: number = 20): Promise<{ items: any[]; total: number }> {
  try {
    const d = await getDb()
    const offset = (page - 1) * limit
    const countRes = await d.query('SELECT COUNT(*) as cnt FROM generations')
    const countRows = sanitizeRows(countRes.values)
    const total = countRows[0]?.cnt || 0
    const res = await d.query(
      'SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    )
    return { items: sanitizeRows(res.values), total }
  } catch (e) {
    console.error('getHistory error:', e)
    return { items: [], total: 0 }
  }
}

export async function getRecentTasks(limit: number = 20): Promise<any[]> {
  try {
    const d = await getDb()
    const res = await d.query(
      `SELECT id, 'generation' as source, model as type, text_content as text_preview, 'completed' as status, created_at FROM generations ORDER BY created_at DESC LIMIT ?`,
      [limit]
    )
    return sanitizeRows(res.values)
  } catch (e) {
    console.error('getRecentTasks error:', e)
    return []
  }
}

export async function deleteGeneration(id: string): Promise<void> {
  const d = await getDb()
  await d.run('DELETE FROM generations WHERE id = ?', [id])
}

// === Voices ===

export async function getVoices(): Promise<any[]> {
  try {
    const d = await getDb()
    const res = await d.query('SELECT * FROM voices ORDER BY created_at DESC')
    return sanitizeRows(res.values)
  } catch (e) {
    console.error('getVoices error:', e)
    return []
  }
}

export async function saveVoice(id: string, name: string, type: string, voiceId: string, description: string, audioPath: string): Promise<void> {
  const d = await getDb()
  await d.run(
    'INSERT OR REPLACE INTO voices (id, name, type, voice_id, description, audio_path) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, type, voiceId, description, audioPath]
  )
}

export async function deleteVoice(id: string): Promise<void> {
  const d = await getDb()
  await d.run('DELETE FROM voices WHERE id = ?', [id])
}

// === Batch Jobs ===

export async function createBatchJob(
  name: string, texts: string[], voice: string, model: string, format: string, speed: number
): Promise<{ job_id: string; total_items: number }> {
  const d = await getDb()
  const jobId = genId()
  await d.run(
    'INSERT INTO batch_jobs (id, name, total_items, voice, model, format, speed) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [jobId, name, texts.length, voice, model, format, speed]
  )
  for (let i = 0; i < texts.length; i++) {
    await d.run(
      'INSERT INTO batch_items (id, job_id, item_index, text_content) VALUES (?, ?, ?, ?)',
      [genId(), jobId, i, texts[i]]
    )
  }
  return { job_id: jobId, total_items: texts.length }
}

export async function getBatchJobs(): Promise<any[]> {
  try {
    const d = await getDb()
    const res = await d.query('SELECT * FROM batch_jobs ORDER BY created_at DESC LIMIT 50')
    return sanitizeRows(res.values)
  } catch (e) {
    console.error('getBatchJobs error:', e)
    return []
  }
}

export async function getBatchJobStatus(jobId: string): Promise<any> {
  try {
    const d = await getDb()
    const jobRes = await d.query('SELECT * FROM batch_jobs WHERE id = ?', [jobId])
    const jobRows = sanitizeRows(jobRes.values)
    const job = jobRows[0]
    if (!job) return null
    const itemsRes = await d.query('SELECT * FROM batch_items WHERE job_id = ? ORDER BY item_index', [jobId])
    return { ...job, items: sanitizeRows(itemsRes.values) }
  } catch (e) {
    console.error('getBatchJobStatus error:', e)
    return null
  }
}

export async function updateBatchItemStatus(itemId: string, status: string, audioPath?: string, error?: string): Promise<void> {
  const d = await getDb()
  if (status === 'completed') {
    await d.run('UPDATE batch_items SET status = ?, audio_path = ? WHERE id = ?', [status, audioPath, itemId])
  } else if (status === 'failed') {
    await d.run('UPDATE batch_items SET status = ?, error_message = ? WHERE id = ?', [status, error, itemId])
  } else {
    await d.run('UPDATE batch_items SET status = ? WHERE id = ?', [status, itemId])
  }
}

export async function updateBatchJobProgress(jobId: string, completedItems: number): Promise<void> {
  const d = await getDb()
  await d.run('UPDATE batch_jobs SET completed_items = ? WHERE id = ?', [completedItems, jobId])
}

export async function updateBatchJobStatus(jobId: string, status: string): Promise<void> {
  const d = await getDb()
  if (status === 'completed') {
    await d.run("UPDATE batch_jobs SET status = ?, completed_at = datetime('now') WHERE id = ?", [status, jobId])
  } else {
    await d.run('UPDATE batch_jobs SET status = ? WHERE id = ?', [status, jobId])
  }
}

export async function getBatchItemAudioPath(jobId: string, itemIndex: number): Promise<string | null> {
  try {
    const d = await getDb()
    const res = await d.query(
      'SELECT audio_path FROM batch_items WHERE job_id = ? AND item_index = ?',
      [jobId, itemIndex]
    )
    const rows = sanitizeRows(res.values)
    return rows[0]?.audio_path || null
  } catch (e) {
    console.error('getBatchItemAudioPath error:', e)
    return null
  }
}
