import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deretSaldo, labelTitik, rupiahRingkas, satuanDariKunci, satuanDeret, skalaY } from './grafik'

test('satuan deret: ≤ 62 hari per hari, lebih panjang per bulan', () => {
  assert.equal(satuanDeret('2026-09-01', '2026-09-30'), 'hari')
  assert.equal(satuanDeret('2026-01-01', '2026-03-03'), 'hari') // tepat 62 hari
  assert.equal(satuanDeret('2026-01-01', '2026-03-04'), 'bulan') // 63 hari
  assert.equal(satuanDeret('2026-01-01', '2026-12-31'), 'bulan')
  assert.equal(satuanDeret('2026-09-10', '2026-09-10'), 'hari')
})

test('satuan dibaca dari bentuk kunci', () => {
  assert.equal(satuanDariKunci('2026-09'), 'bulan')
  assert.equal(satuanDariKunci('2026-09-05'), 'hari')
  assert.equal(satuanDariKunci(undefined), 'hari')
})

test('label titik mengikuti satuan', () => {
  assert.match(labelTitik('2026-09-05', 'hari'), /5 Sep/)
  assert.match(labelTitik('2026-09', 'bulan'), /September 2026/)
})

test('saldo berjalan bertambah dari sisa kas awal', () => {
  const d = deretSaldo(
    [
      { kunci: '1', label: '1', masuk: 100, keluar: 40 },
      { kunci: '2', label: '2', masuk: 0, keluar: 20 },
      { kunci: '3', label: '3', masuk: 50, keluar: 0 },
    ],
    1000,
  )
  assert.deepEqual(d.map((x) => x.saldo), [1060, 1040, 1090])
})

test('rupiah ringkas untuk sumbu', () => {
  assert.equal(rupiahRingkas(0), '0')
  assert.equal(rupiahRingkas(75000), '75 rb')
  assert.equal(rupiahRingkas(1250000), '1,3 jt')
  assert.equal(rupiahRingkas(2000000000), '2 M')
  assert.equal(rupiahRingkas(-50000), '−50 rb')
})

test('skala Y membulatkan batas atas dan memberi garis yang mudah dibaca', () => {
  const a = skalaY(1_750_000)
  assert.ok(a.maks >= 1_750_000)
  assert.equal(a.maks % (a.garis[1] - a.garis[0]), 0)
  assert.ok(a.garis.length >= 4 && a.garis.length <= 7)
  assert.deepEqual(skalaY(0).garis, [0, 1])
  const b = skalaY(80_000)
  assert.equal(b.maks, 80_000)
})
