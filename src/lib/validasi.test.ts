import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jenisKelaminDariHubungan, skemaAnggotaBaru, skemaKeluarga } from './validasi'

test('Istri selalu perempuan, Suami selalu laki-laki, hubungan lain bebas', () => {
  assert.equal(jenisKelaminDariHubungan('Istri'), 'P')
  assert.equal(jenisKelaminDariHubungan('Suami'), 'L')
  assert.equal(jenisKelaminDariHubungan('Anak'), null)
  assert.equal(jenisKelaminDariHubungan(null), null)
})

test('jenis kelamin boleh kosong; status keluarga bawaan aktif', () => {
  const k = skemaKeluarga.parse({ nama: 'Ani', hubungan: 'Istri' })
  assert.equal(k.status, 'aktif')
  assert.equal(k.jenisKelamin, undefined)
  const a = skemaAnggotaBaru.parse({ nama: 'Budi Santoso', jenisKelamin: 'L', keluarga: [{ nama: 'Ani', hubungan: 'Istri' }] })
  assert.equal(a.keluarga?.length, 1)
  assert.equal(skemaAnggotaBaru.safeParse({ nama: 'Budi Santoso', jenisKelamin: 'X' }).success, false)
})
