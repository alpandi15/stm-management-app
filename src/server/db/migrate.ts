// Perintah `npm run db:migrate`: menerapkan migrasi dan seed lalu keluar.
// Aplikasi sendiri sudah melakukannya otomatis saat start; skrip ini untuk
// pengembangan dan untuk memastikan database bisa dibuat dari nol.
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { count } from 'drizzle-orm'
import * as schema from './schema'
import { seedJenisBawaan } from './seed'

const dataDir = path.resolve(process.env.STM_DATA_DIR ?? './data')
const migrationsDir = process.env.STM_MIGRATIONS_DIR ?? path.join(process.cwd(), 'drizzle')

fs.mkdirSync(dataDir, { recursive: true })
const sqlite = new Database(path.join(dataDir, 'stm.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')

const db = drizzle(sqlite, { schema })
// Kunci asing mati selama migrasi (lihat db/index.ts), dinyalakan dan diperiksa sesudahnya
sqlite.pragma('foreign_keys = OFF')
migrate(db, { migrationsFolder: migrationsDir })
sqlite.pragma('foreign_keys = ON')
const rusak = sqlite.pragma('foreign_key_check') as unknown[]
if (rusak.length > 0) throw new Error(`Integritas kunci asing rusak setelah migrasi: ${JSON.stringify(rusak.slice(0, 5))}`)
const ditambahkan = seedJenisBawaan(db)
const total = db.select({ n: count() }).from(schema.jenis).get()?.n ?? 0

console.log(`Migrasi diterapkan ke ${path.join(dataDir, 'stm.db')}`)
console.log(`Jenis bawaan ditambahkan: ${ditambahkan}, total jenis: ${total}`)
sqlite.close()
