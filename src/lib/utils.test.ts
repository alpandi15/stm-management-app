import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cn } from './utils'

test('cn tidak membuang warna teks kustom karena ukuran font kustom', () => {
  const hasil = cn('text-form text-primary-fg')
  assert.ok(hasil.includes('text-form'))
  assert.ok(hasil.includes('text-primary-fg'))
  assert.ok(cn('text-isi text-arah-fg').includes('text-arah-fg'))
})

test('cn tetap menggabungkan kelas yang benar-benar bentrok', () => {
  assert.equal(cn('text-isi text-form'), 'text-form')
  assert.equal(cn('rounded-input rounded-kartu'), 'rounded-kartu')
  assert.equal(cn('min-h-sentuh min-h-aksi'), 'min-h-aksi')
  assert.equal(cn('text-muted text-primary'), 'text-primary')
})
