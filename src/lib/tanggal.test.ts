import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apakahISO, formatTanggal, kalimatRentang, rentangPeriode } from './tanggal'

test('rentang harian sama dengan acuan', () => {
  assert.deepEqual(rentangPeriode('harian', '2026-01-20'), { awal: '2026-01-20', akhir: '2026-01-20' })
})

test('rentang mingguan dimulai Senin dan melintasi pergantian tahun', () => {
  // 1 Januari 2026 jatuh pada hari Kamis
  assert.deepEqual(rentangPeriode('mingguan', '2026-01-01'), { awal: '2025-12-29', akhir: '2026-01-04' })
  // Senin tetap di minggunya sendiri
  assert.deepEqual(rentangPeriode('mingguan', '2026-01-05'), { awal: '2026-01-05', akhir: '2026-01-11' })
  // Minggu (hari terakhir) tidak lompat ke minggu berikutnya
  assert.deepEqual(rentangPeriode('mingguan', '2026-01-11'), { awal: '2026-01-05', akhir: '2026-01-11' })
})

test('rentang bulanan termasuk tahun kabisat', () => {
  assert.deepEqual(rentangPeriode('bulanan', '2026-02-10'), { awal: '2026-02-01', akhir: '2026-02-28' })
  assert.deepEqual(rentangPeriode('bulanan', '2028-02-10'), { awal: '2028-02-01', akhir: '2028-02-29' })
})

test('rentang tahunan', () => {
  assert.deepEqual(rentangPeriode('tahunan', '2026-07-15'), { awal: '2026-01-01', akhir: '2026-12-31' })
})

test('format tanggal berbahasa Indonesia', () => {
  assert.equal(formatTanggal('2026-01-20'), '20 Januari 2026')
  assert.equal(kalimatRentang({ awal: '2026-01-01', akhir: '2026-01-31' }), '1 Januari 2026 sampai 31 Januari 2026')
  assert.equal(kalimatRentang({ awal: '2026-01-01', akhir: '2026-01-01' }), '1 Januari 2026')
})

test('apakahISO menolak tanggal yang tidak ada', () => {
  assert.equal(apakahISO('2026-02-30'), false)
  assert.equal(apakahISO('2026-1-5'), false)
  assert.equal(apakahISO('2026-01-05'), true)
})
