import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hitungTunggakan, wajibBayarDuka, type AnggotaUntukDuka, type KejadianUntukDuka } from './duka'

const dasar: AnggotaUntukDuka = { id: 1, aktif: true, status: 'aktif', tanggalMeninggal: null, tanggalBergabung: null, tanggalNonaktif: null }
const k = (id: number, tanggal: string, tarif = 5000, ekstra: Partial<KejadianUntukDuka> = {}): KejadianUntukDuka => ({ id, tanggalMeninggal: tanggal, tarif, anggotaId: null, anggotaKeluargaId: null, ...ekstra })

test('anggota lama aktif wajib untuk semua kejadian', () => {
  assert.equal(wajibBayarDuka(dasar, k(1, '2024-01-12')), true)
})

test('bergabung setelah kejadian tidak wajib; pada hari yang sama wajib', () => {
  const baru = { ...dasar, tanggalBergabung: '2025-06-01' }
  assert.equal(wajibBayarDuka(baru, k(1, '2025-05-30')), false)
  assert.equal(wajibBayarDuka(baru, k(2, '2025-06-01')), true)
})

test('almarhum sendiri tidak wajib atas kejadiannya; kejadian keluarganya tetap wajib', () => {
  assert.equal(wajibBayarDuka(dasar, k(1, '2025-01-01', 7000, { anggotaId: 1 })), false)
  assert.equal(wajibBayarDuka(dasar, k(2, '2025-01-01', 7000, { anggotaId: 1, anggotaKeluargaId: 9 })), true)
})

test('anggota meninggal tidak wajib untuk kejadian setelah tanggal meninggalnya', () => {
  const alm = { ...dasar, status: 'meninggal' as const, tanggalMeninggal: '2025-03-01' }
  assert.equal(wajibBayarDuka(alm, k(1, '2025-02-01')), true)
  assert.equal(wajibBayarDuka(alm, k(2, '2025-04-01')), false)
})

test('nonaktif: wajib sampai tanggal nonaktif; tanpa tanggal tidak wajib', () => {
  const non = { ...dasar, aktif: false, tanggalNonaktif: '2025-03-01' }
  assert.equal(wajibBayarDuka(non, k(1, '2025-02-01')), true)
  assert.equal(wajibBayarDuka(non, k(2, '2025-03-02')), false)
  assert.equal(wajibBayarDuka({ ...dasar, aktif: false }, k(3, '2020-01-01')), false)
})

test('tunggakan mengikuti tarif tiap kejadian, bukan tarif terbaru', () => {
  const daftar = [k(1, '2024-01-01', 5000), k(2, '2024-06-01', 5000), k(3, '2025-01-01', 7000), k(4, '2025-05-01', 7000)]
  const t = hitungTunggakan(dasar, daftar, new Set([1, 3]))
  assert.deepEqual(t, { jumlahWajib: 4, jumlahBayar: 2, jumlahNunggak: 2, totalNunggak: 12000 })
})
