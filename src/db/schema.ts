import { Database } from "bun:sqlite"
import { config } from "../config"

const SCHEMA_VERSION = 2

export { Database } from "bun:sqlite"

export function initDB(db?: Database): Database {
  const database = db ?? new Database(config.dbPath)

  database.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)`)

  const row = database.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as { value: string } | undefined
  const currentVersion = Number(row?.value ?? 0)

  if (currentVersion < 1) runMigration1(database)
  if (currentVersion < 2) runMigration2(database)

  database.prepare(`INSERT OR REPLACE INTO _meta VALUES ('schema_version', ?)`).run(String(SCHEMA_VERSION))

  return database
}

function runMigration1(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS daily_summary (
      date TEXT PRIMARY KEY,
      total_input INTEGER DEFAULT 0,
      total_output INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      session_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
    CREATE INDEX IF NOT EXISTS idx_sessions_model ON sessions(model);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
  `)
}

function runMigration2(db: Database) {
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN tags TEXT`)
  } catch {}
}