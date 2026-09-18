import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { seedJenisBawaan } from './seed'
import { dataDir, migrationsDir } from '../config'

export type Db = BetterSQLite3Database<typeof schema>

export { dataDir, migrationsDir }
export const dbFile = path.join(dataDir, 'stm.db')

function bukaKoneksi(): { sqlite: Database.Database; db: Db } {
  fs.mkdirSync(dataDir, { recursive: true })

  const sqlite = new Database(dbFile)
  sqlite.pragma('journal_mode = WAL') // tulis-baca bersamaan lebih aman
  sqlite.pragma('foreign_keys = ON') // SQLite mematikannya secara bawaan
  sqlite.pragma('busy_timeout = 5000')

  const db = drizzle(sqlite, { schema })

  // Migrasi + seed berjalan otomatis setiap aplikasi start (docs/02 §3.4):
  // pengguna memperbarui aplikasi lewat installer dan tidak akan mengetik perintah apa pun.
  migrate(db, { migrationsFolder: migrationsDir })
  seedJenisBawaan(db)

  return { sqlite, db }
}

// Singleton di globalThis: hot reload Next saat pengembangan memuat ulang modul ini
// berkali-kali, dan setiap pemuatan akan membuka koneksi baru bila tidak disimpan di sini.
const g = globalThis as unknown as { __stmDb?: ReturnType<typeof bukaKoneksi> }
const koneksi = g.__stmDb ?? bukaKoneksi()
if (process.env.NODE_ENV !== 'production') g.__stmDb = koneksi

export const db = koneksi.db
export const sqlite = koneksi.sqlite
export { schema }
