import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adaBiayaKutip, hitungBiayaKutip } from './biaya-kutip'

test('biaya kutip: persen dari bruto, pecahan dibulatkan ke bawah, 0 bila tidak ada', () => {
  assert.equal(hitungBiayaKutip(100000, 10), 10000)
  assert.equal(hitungBiayaKutip(25555, 10), 2555)
  assert.equal(hitungBiayaKutip(100000, null), 0)
  assert.equal(hitungBiayaKutip(100000, 0), 0)
  assert.equal(adaBiayaKutip({ arah: 'masuk', biayaKutipPersen: 10 }), true)
  assert.equal(adaBiayaKutip({ arah: 'keluar', biayaKutipPersen: 10 }), false)
  assert.equal(adaBiayaKutip({ arah: 'masuk', biayaKutipPersen: null }), false)
})
