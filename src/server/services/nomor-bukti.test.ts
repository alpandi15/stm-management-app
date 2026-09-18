import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '@/server/db/schema'
import { nomorBuktiBerikutnya } from './nomor-bukti'

function dbUji() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  const jenisId = db.insert(schema.jenis).values({ kode: 'PM01', nama: 'Iuran', arah: 'masuk', bawaan: true }).returning({ id: schema.jenis.id }).get().id
  const simpan = (arah: 'masuk' | 'keluar', tanggal: string) =>
    sqlite.transaction(() => {
      const noBukti = nomorBuktiBerikutnya(db, arah, Number(tanggal.slice(0, 4)))
      db.insert(schema.transaksi)
        .values({ noBukti, tanggal, arah, jenisId, keterangan: 'uji', jumlah: 1000, dibuatPada: 0, diubahPada: 0 })
        .run()
      return noBukti
    })()
  return { db, simpan }
}

test('nomor bukti urut per arah per tahun', () => {
  const { simpan } = dbUji()
  assert.equal(simpan('masuk', '2026-01-05'), 'KM-2026-0001')
  assert.equal(simpan('masuk', '2026-01-06'), 'KM-2026-0002')
  assert.equal(simpan('keluar', '2026-01-06'), 'KK-2026-0001')
  assert.equal(simpan('masuk', '2027-01-01'), 'KM-2027-0001')
  assert.equal(simpan('masuk', '2026-12-31'), 'KM-2026-0003')
})

test('nomor yang sudah dihapus (lunak) tidak dipakai ulang', () => {
  const { db, simpan } = dbUji()
  simpan('masuk', '2026-01-05')
  const kedua = simpan('masuk', '2026-01-05')
  assert.equal(kedua, 'KM-2026-0002')
  db.update(schema.transaksi).set({ dihapusPada: Date.now() }).where(eq(schema.transaksi.noBukti, kedua)).run()
  assert.equal(simpan('masuk', '2026-01-07'), 'KM-2026-0003')
})

test('nomor 9999 ke atas tetap terbaca (tidak terpotong)', () => {
  const { db, simpan } = dbUji()
  db.insert(schema.transaksi)
    .values({ noBukti: 'KM-2026-9999', tanggal: '2026-01-01', arah: 'masuk', jenisId: 1, keterangan: 'x', jumlah: 1, dibuatPada: 0, diubahPada: 0 })
    .run()
  assert.equal(simpan('masuk', '2026-01-02'), 'KM-2026-10000')
  assert.equal(simpan('masuk', '2026-01-03'), 'KM-2026-10001')
})
