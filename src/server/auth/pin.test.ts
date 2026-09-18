import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buatKodePemulihan, jedaKunciMs, normalisasiKode, pinMudahDitebak } from './pin'

test('PIN mudah ditebak: angka sama dan berurutan ditolak', () => {
  assert.equal(pinMudahDitebak('111111'), true)
  assert.equal(pinMudahDitebak('123456'), true)
  assert.equal(pinMudahDitebak('654321'), true)
  assert.equal(pinMudahDitebak('456789'), true)
  assert.equal(pinMudahDitebak('12345'), true) // bukan 6 digit
  assert.equal(pinMudahDitebak('135790'), false)
  assert.equal(pinMudahDitebak('112233'), false)
  assert.equal(pinMudahDitebak('200517'), false)
})

test('jeda kunci bertambah pada kelipatan 5', () => {
  assert.equal(jedaKunciMs(1), 0)
  assert.equal(jedaKunciMs(4), 0)
  assert.equal(jedaKunciMs(5), 60_000)
  assert.equal(jedaKunciMs(6), 0)
  assert.equal(jedaKunciMs(10), 5 * 60_000)
  assert.equal(jedaKunciMs(15), 15 * 60_000)
  assert.equal(jedaKunciMs(20), 15 * 60_000)
})

test('kode pemulihan: 10 karakter tanpa I/O/0/1, format XXXXX-XXXXX', () => {
  for (let i = 0; i < 200; i++) {
    const k = buatKodePemulihan()
    assert.match(k, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/)
  }
})

test('normalisasi kode menerima huruf kecil, spasi, dan tanpa strip', () => {
  assert.equal(normalisasiKode('abcde 23456'), 'ABCDE-23456')
  assert.equal(normalisasiKode('ABCDE23456'), 'ABCDE-23456')
  assert.equal(normalisasiKode(' abc-de-234-56 '), 'ABCDE-23456')
})
