import { test } from 'node:test'
import assert from 'node:assert/strict'
import { namaBerkasDokumen } from './dokumen'

test('nama berkas PDF deskriptif', () => {
  assert.equal(namaBerkasDokumen('ringkas', 'bulanan', { awal: '2026-01-01', akhir: '2026-01-31' }), 'Laporan-Ringkas-Januari-2026.pdf')
  assert.equal(namaBerkasDokumen('buku-kas', 'tahunan', { awal: '2026-01-01', akhir: '2026-12-31' }), 'Buku-Kas-2026.pdf')
  assert.equal(namaBerkasDokumen('pemeriksaan', 'mingguan', { awal: '2025-12-29', akhir: '2026-01-04' }), 'Pemeriksaan-Kas-2025-12-29_2026-01-04.pdf')
})
