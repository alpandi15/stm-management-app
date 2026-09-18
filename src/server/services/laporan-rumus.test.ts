import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '@/server/db/schema'
import { rentangPeriode } from '@/lib/tanggal'
import { grafikBulanan, rekapPenyetor, rincianPerJenis, ringkasanPeriode } from './laporan-rumus'

function dbUji() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  const iuran = db.insert(schema.jenis).values({ kode: 'PM01', nama: 'Iuran', arah: 'masuk' }).returning().get().id
  const sumbangan = db.insert(schema.jenis).values({ kode: 'PM04', nama: 'Sumbangan', arah: 'masuk' }).returning().get().id
  const santunan = db.insert(schema.jenis).values({ kode: 'PK01', nama: 'Santunan', arah: 'keluar' }).returning().get().id
  let n = 0
  const catat = (tanggal: string, arah: 'masuk' | 'keluar', jenisId: number, jumlah: number, ekstra: Partial<typeof schema.transaksi.$inferInsert> = {}) =>
    db.insert(schema.transaksi)
      .values({ noBukti: `X-${++n}`, tanggal, arah, jenisId, keterangan: 'uji', jumlah, dibuatPada: 0, diubahPada: 0, ...ekstra })
      .run()
  return { db, catat, iuran, sumbangan, santunan }
}

test('batas rentang bulanan: tanggal 1 dan tanggal terakhir ikut terhitung, di luarnya tidak', () => {
  const { db, catat, iuran, santunan } = dbUji()
  catat('2026-01-31', 'masuk', iuran, 100) // hari terakhir bulan sebelumnya → sisa awal
  catat('2026-02-01', 'masuk', iuran, 1000) // hari pertama
  catat('2026-02-28', 'keluar', santunan, 300) // hari terakhir (2026 bukan kabisat)
  catat('2026-03-01', 'masuk', iuran, 5000) // hari pertama bulan berikutnya → tidak ikut
  const r = ringkasanPeriode(db, 50, rentangPeriode('bulanan', '2026-02-15'))
  assert.equal(r.sisaAwal, 150)
  assert.equal(r.masuk, 1000)
  assert.equal(r.keluar, 300)
  assert.equal(r.selisih, 700)
  assert.equal(r.sisaAkhir, 850)
  assert.equal(r.jumlahCatatan, 2)
})

test('minggu yang melintasi pergantian tahun (29 Des 2025 – 4 Jan 2026)', () => {
  const { db, catat, iuran, santunan } = dbUji()
  catat('2025-12-28', 'masuk', iuran, 999) // Minggu sebelum → sisa awal
  catat('2025-12-29', 'masuk', iuran, 100) // Senin, hari pertama
  catat('2026-01-04', 'keluar', santunan, 40) // Minggu, hari terakhir
  catat('2026-01-05', 'masuk', iuran, 777) // Senin berikutnya → tidak ikut
  const r = ringkasanPeriode(db, 0, rentangPeriode('mingguan', '2026-01-01'))
  assert.equal(r.sisaAwal, 999)
  assert.equal(r.masuk, 100)
  assert.equal(r.keluar, 40)
  assert.equal(r.sisaAkhir, 1059)
})

test('sisa kas awal/akhir mengabaikan penyaring jenis; masuk/keluar mengikutinya', () => {
  const { db, catat, iuran, sumbangan, santunan } = dbUji()
  catat('2026-02-01', 'masuk', iuran, 1000)
  catat('2026-02-02', 'masuk', sumbangan, 500)
  catat('2026-02-03', 'keluar', santunan, 200)
  const r = ringkasanPeriode(db, 0, rentangPeriode('bulanan', '2026-02-01'), { jenisId: iuran })
  assert.equal(r.masuk, 1000)
  assert.equal(r.keluar, 0)
  assert.equal(r.jumlahCatatan, 1)
  assert.equal(r.sisaAkhir, 1300) // 1000 + 500 − 200, tanpa penyaring
})

test('catatan terhapus tidak ikut di mana pun', () => {
  const { db, catat, iuran } = dbUji()
  catat('2026-02-01', 'masuk', iuran, 1000)
  catat('2026-02-02', 'masuk', iuran, 999, { dihapusPada: 1 })
  const r = ringkasanPeriode(db, 0, rentangPeriode('bulanan', '2026-02-01'))
  assert.equal(r.masuk, 1000)
  assert.equal(r.jumlahCatatan, 1)
  assert.equal(grafikBulanan(db, 2026)[1].masuk, 1000)
})

test('rincian per jenis: persen terhadap total arah, 0 bila total 0', () => {
  const { db, catat, iuran, sumbangan } = dbUji()
  catat('2026-02-01', 'masuk', iuran, 750)
  catat('2026-02-02', 'masuk', sumbangan, 250)
  const masuk = rincianPerJenis(db, rentangPeriode('bulanan', '2026-02-01'), 'masuk')
  assert.deepEqual(masuk.map((r) => [r.nama, r.total, r.jumlah, r.persen]), [['Iuran', 750, 1, 75], ['Sumbangan', 250, 1, 25]])
  const keluar = rincianPerJenis(db, rentangPeriode('bulanan', '2026-02-01'), 'keluar')
  assert.deepEqual(keluar, [])
})

test('grafik bulanan: 12 bulan, bulan kosong bernilai 0, tahun lain tidak ikut', () => {
  const { db, catat, iuran, santunan } = dbUji()
  catat('2026-01-15', 'masuk', iuran, 100)
  catat('2026-12-31', 'keluar', santunan, 40)
  catat('2025-12-31', 'masuk', iuran, 9999)
  const g = grafikBulanan(db, 2026)
  assert.equal(g.length, 12)
  assert.deepEqual(g[0], { bulan: '2026-01', masuk: 100, keluar: 0 })
  assert.deepEqual(g[11], { bulan: '2026-12', masuk: 0, keluar: 40 })
  assert.equal(g.reduce((a, b) => a + b.masuk, 0), 100)
})

test('rekap per penyetor: dikelompokkan, tanpa penyetor = Bendahara, mengikuti penyaring', () => {
  const { db, catat, iuran, santunan } = dbUji()
  const rahmat = db.insert(schema.anggota).values({ nama: 'Bpk. Rahmat', pengutip: true, dibuatPada: 0 }).returning().get().id
  const sari = db.insert(schema.anggota).values({ nama: 'Ibu Sari', dibuatPada: 0 }).returning().get().id
  catat('2026-02-01', 'masuk', iuran, 100, { penyetorAnggotaId: rahmat })
  catat('2026-02-02', 'masuk', iuran, 200, { penyetorAnggotaId: rahmat })
  catat('2026-02-03', 'masuk', iuran, 50, { penyetorAnggotaId: sari })
  catat('2026-02-04', 'keluar', santunan, 30, { penyetorAnggotaId: rahmat })
  catat('2026-02-05', 'masuk', iuran, 7)
  const r = rekapPenyetor(db, rentangPeriode('bulanan', '2026-02-10'))
  assert.deepEqual(r.map((b) => [b.nama, b.jumlah, b.masuk, b.keluar]), [
    ['Bpk. Rahmat', 3, 300, 30],
    ['Ibu Sari', 1, 50, 0],
    ['Bendahara', 1, 7, 0],
  ])
  const hanyaRahmat = rekapPenyetor(db, rentangPeriode('bulanan', '2026-02-10'), { penyetor: rahmat })
  assert.deepEqual(hanyaRahmat.map((b) => b.nama), ['Bpk. Rahmat'])
  const bendahara = rekapPenyetor(db, rentangPeriode('bulanan', '2026-02-10'), { penyetor: 'bendahara' })
  assert.deepEqual(bendahara.map((b) => [b.nama, b.masuk]), [['Bendahara', 7]])
})
