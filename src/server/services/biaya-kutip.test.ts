import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Service transaksi memakai koneksi global (STM_DATA_DIR) — pakai folder sementara.
// `server-only` menolak dimuat di luar Next; di tes diganti modul kosong.
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
req.cache[req.resolve('server-only')] = { id: 'server-only', filename: 'server-only', loaded: true, exports: {} } as NodeJS.Module
process.env.STM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'stm-uji-kutip-'))
process.env.STM_MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle')

type Modul = { svc: typeof import('./transaksi'); db: typeof import('@/server/db'); schema: typeof import('@/server/db/schema'); eq: typeof import('drizzle-orm').eq }
let m: Modul
let pm12: number
let rahmat: number

before(async () => {
  const [svc, dbm, schema, orm] = await Promise.all([import('./transaksi'), import('@/server/db'), import('@/server/db/schema'), import('drizzle-orm')])
  m = { svc, db: dbm, schema, eq: orm.eq }
  m.db.db.insert(m.schema.pengaturan).values({ namaStm: 'STM Uji', namaBendahara: 'Uji', tanggalMulai: '2026-01-01', pinHash: 'x', pemulihanHash: 'x', dibuatPada: 0, diubahPada: 0 }).run()
  pm12 = m.db.db.select().from(m.schema.jenis).where(m.eq(m.schema.jenis.kode, 'PM12')).get()!.id
  m.db.db.update(m.schema.jenis).set({ biayaKutipPersen: 10 }).where(m.eq(m.schema.jenis.id, pm12)).run()
  rahmat = m.db.db.insert(m.schema.anggota).values({ nama: 'Rahmat Hidayat', pengutip: true, dibuatPada: 0 }).returning().get().id
})

const anak = (indukId: number) => m.db.db.select().from(m.schema.transaksi).where(m.eq(m.schema.transaksi.indukId, indukId)).all()
const input = (jumlah: number, ekstra: Record<string, unknown> = {}) => ({ tanggal: '2026-09-10', arah: 'masuk' as const, jenisId: pm12, keterangan: 'Iuran duka alm. Karim', jumlah, metode: 'tunai' as const, penyetorAnggotaId: rahmat, abaikanDuplikat: true, ...ekstra })

test('uang masuk 100.000 tetap bruto; biaya kutip 10.000 dicatat otomatis sebagai uang keluar bertaut induk', () => {
  const h = m.svc.buatCatatan(input(100000))
  assert.equal(h.perluKonfirmasi, false)
  const induk = (h as { catatan: { id: number; jumlah: number; noBukti: string } }).catatan
  assert.equal(induk.jumlah, 100000)
  const [a] = anak(induk.id)
  assert.ok(a)
  assert.equal(a.arah, 'keluar')
  assert.equal(a.jumlah, 10000)
  assert.equal(a.otomatis, true)
  assert.equal(a.penyetorAnggotaId, rahmat)
  assert.equal(a.namaPihak, 'Rahmat Hidayat')
  assert.match(a.keterangan, /Biaya kutip 10% — KM-2026-/)
  assert.match(a.noBukti, /^KK-2026-/)
})

test('ubah jumlah induk → biaya kutip ikut; matikan biaya kutip → anak terhapus; nyalakan lagi → dibuat ulang', () => {
  const induk = (m.svc.buatCatatan(input(200000)) as { catatan: { id: number } }).catatan
  assert.equal(anak(induk.id)[0].jumlah, 20000)
  m.svc.ubahCatatan(induk.id, input(300000))
  const hidup = anak(induk.id).filter((a) => !a.dihapusPada)
  assert.equal(hidup.length, 1)
  assert.equal(hidup[0].jumlah, 30000)
  m.svc.ubahCatatan(induk.id, input(300000, { biayaKutip: false }))
  assert.equal(anak(induk.id).filter((a) => !a.dihapusPada).length, 0)
  m.svc.ubahCatatan(induk.id, input(300000))
  assert.equal(anak(induk.id).filter((a) => !a.dihapusPada).length, 1)
})

test('hapus induk → anak ikut terhapus; kembalikan → anak ikut kembali', () => {
  const induk = (m.svc.buatCatatan(input(50000)) as { catatan: { id: number } }).catatan
  m.svc.hapusCatatan(induk.id)
  assert.ok(anak(induk.id)[0].dihapusPada)
  m.svc.kembalikanCatatan(induk.id)
  assert.equal(anak(induk.id)[0].dihapusPada, null)
})

test('anak otomatis tidak bisa diubah/dihapus langsung; jenis tanpa persen tidak membuat anak', () => {
  const induk = (m.svc.buatCatatan(input(50000)) as { catatan: { id: number } }).catatan
  const a = anak(induk.id)[0]
  assert.throws(() => m.svc.hapusCatatan(a.id), /dibuat otomatis/)
  assert.throws(() => m.svc.ubahCatatan(a.id, input(1)), /dibuat otomatis/)
  const pm02 = m.db.db.select().from(m.schema.jenis).where(m.eq(m.schema.jenis.kode, 'PM02')).get()!.id
  const lain = (m.svc.buatCatatan(input(50000, { jenisId: pm02 })) as { catatan: { id: number } }).catatan
  assert.equal(anak(lain.id).length, 0)
})
