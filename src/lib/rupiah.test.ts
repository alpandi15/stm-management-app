import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRupiah, parseRupiah, terbilang, terbilangRupiah } from './rupiah'

test('formatRupiah memakai pemisah titik dan awalan Rp', () => {
  assert.equal(formatRupiah(0), 'Rp 0')
  assert.equal(formatRupiah(999), 'Rp 999')
  assert.equal(formatRupiah(1000), 'Rp 1.000')
  assert.equal(formatRupiah(1250000), 'Rp 1.250.000')
  assert.equal(formatRupiah(-250000), '-Rp 250.000')
  assert.equal(formatRupiah(999_999_999_999), 'Rp 999.999.999.999')
})

test('parseRupiah membaca ketikan dengan titik dan awalan', () => {
  assert.equal(parseRupiah('1.250.000'), 1250000)
  assert.equal(parseRupiah('Rp 1.250.000'), 1250000)
  assert.equal(parseRupiah(''), 0)
  assert.equal(parseRupiah('abc'), 0)
})

test('terbilang: nol, satuan, belasan, puluhan', () => {
  assert.equal(terbilang(0), 'nol')
  assert.equal(terbilang(1), 'satu')
  assert.equal(terbilang(10), 'sepuluh')
  assert.equal(terbilang(11), 'sebelas')
  assert.equal(terbilang(12), 'dua belas')
  assert.equal(terbilang(19), 'sembilan belas')
  assert.equal(terbilang(20), 'dua puluh')
  assert.equal(terbilang(21), 'dua puluh satu')
  assert.equal(terbilang(99), 'sembilan puluh sembilan')
})

test('terbilang: ratusan, seribu, ribuan', () => {
  assert.equal(terbilang(100), 'seratus')
  assert.equal(terbilang(101), 'seratus satu')
  assert.equal(terbilang(111), 'seratus sebelas')
  assert.equal(terbilang(200), 'dua ratus')
  assert.equal(terbilang(1000), 'seribu')
  assert.equal(terbilang(1001), 'seribu satu')
  assert.equal(terbilang(2000), 'dua ribu')
  assert.equal(terbilang(11000), 'sebelas ribu')
  assert.equal(terbilang(100000), 'seratus ribu')
  assert.equal(terbilang(999999), 'sembilan ratus sembilan puluh sembilan ribu sembilan ratus sembilan puluh sembilan')
})

test('terbilang: juta, miliar, triliun', () => {
  assert.equal(terbilang(1250000), 'satu juta dua ratus lima puluh ribu')
  assert.equal(terbilang(1000000), 'satu juta')
  assert.equal(terbilang(1001000), 'satu juta seribu')
  assert.equal(terbilang(2500000000), 'dua miliar lima ratus juta')
  assert.equal(terbilang(1_000_000_000_000), 'satu triliun')
  assert.equal(
    terbilang(999_999_999_999),
    'sembilan ratus sembilan puluh sembilan miliar sembilan ratus sembilan puluh sembilan juta sembilan ratus sembilan puluh sembilan ribu sembilan ratus sembilan puluh sembilan',
  )
})

test('terbilangRupiah: huruf besar di awal dan kata rupiah', () => {
  assert.equal(terbilangRupiah(1250000), 'Satu juta dua ratus lima puluh ribu rupiah')
  assert.equal(terbilangRupiah(0), 'Nol rupiah')
})
