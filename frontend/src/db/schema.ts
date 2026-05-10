export const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS voices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    voice_id TEXT,
    description TEXT,
    audio_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    voice TEXT,
    text_content TEXT NOT NULL,
    audio_path TEXT NOT NULL,
    format TEXT DEFAULT 'wav',
    speed REAL DEFAULT 1.0,
    emotion TEXT,
    duration REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total_items INTEGER,
    completed_items INTEGER DEFAULT 0,
    voice TEXT,
    model TEXT,
    format TEXT DEFAULT 'wav',
    speed REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS batch_items (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    audio_path TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES batch_jobs(id)
  )`,
  `CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_base TEXT NOT NULL,
    models TEXT NOT NULL DEFAULT '[]',
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
]
