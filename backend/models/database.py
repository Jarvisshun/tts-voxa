import aiosqlite
from utils.config import DATABASE_PATH

DB_PATH = DATABASE_PATH


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS voices (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                voice_id TEXT,
                description TEXT,
                audio_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS generations (
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
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS batch_jobs (
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
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS batch_items (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                item_index INTEGER NOT NULL,
                text_content TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                audio_path TEXT,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES batch_jobs(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key TEXT NOT NULL,
                api_base TEXT NOT NULL,
                models TEXT NOT NULL DEFAULT '[]',
                is_default INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migrate: add format/speed columns to batch_jobs if missing
        try:
            await db.execute("SELECT format FROM batch_jobs LIMIT 0")
        except Exception:
            await db.execute("ALTER TABLE batch_jobs ADD COLUMN format TEXT DEFAULT 'wav'")
        try:
            await db.execute("SELECT speed FROM batch_jobs LIMIT 0")
        except Exception:
            await db.execute("ALTER TABLE batch_jobs ADD COLUMN speed REAL DEFAULT 1.0")

        await db.commit()
