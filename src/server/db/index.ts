import 'server-only'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'node:path'
import * as schema from './schema'
import { seedJenisBawaan } from './seed'
import { dataDir, migrationsDir } from '../config'

export type Db = BetterSQLite3Database<typeof schema>

export { dataDir, migrationsDir }
export const dbFile = path.join(dataDir, 'stm.db')

type Koneksi = { sqlite: Database.Database; db: Db }

function bukaKoneksi(): Koneksi {
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
// Disimpan sebagai pemegang (holder) supaya koneksi bisa ditutup dan dibuka ulang saat
// memulihkan cadangan (docs/02 §8.3) tanpa mengganti impor `db` di seluruh kode.
const g = globalThis as unknown as { __stmKoneksi?: { aktif: Koneksi; cadanganOtomatisSudah?: boolean } }
if (!g.__stmKoneksi) g.__stmKoneksi = { aktif: bukaKoneksi() }
const pemegang = g.__stmKoneksi

/** Menutup koneksi aktif. Setelah ini `db` tidak boleh dipakai sampai bukaUlangKoneksi(). */
export function tutupKoneksi(): void {
  pemegang.aktif.sqlite.close()
}

export function bukaUlangKoneksi(): void {
  pemegang.aktif = bukaKoneksi()
}

/** Penanda satu kali per proses untuk cadangan otomatis saat aplikasi dibuka. */
export function tandaiCadanganOtomatis(): boolean {
  if (pemegang.cadanganOtomatisSudah) return false
  pemegang.cadanganOtomatisSudah = true
  return true
}

// Proxy: setiap akses `db.select()` / `sqlite.pragma()` diarahkan ke koneksi yang sedang
// aktif, sehingga pemulihan cadangan cukup menutup & membuka ulang koneksi.
function proksi<T extends object>(ambil: () => T): T {
  return new Proxy({} as T, {
    get(_, k) {
      const target = ambil()
      const v = Reflect.get(target, k)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
}

export const db: Db = proksi(() => pemegang.aktif.db)
export const sqlite: Database.Database = proksi(() => pemegang.aktif.sqlite)
export { schema }
