// Membaca (atau membuat) kunci penanda cookie sesi di STM_DATA_DIR/.secret dan
// memasangnya ke process.env.STM_SESSION_SECRET — harus terjadi SEBELUM server Next
// dimuat, supaya middleware (edge runtime, tanpa akses berkas) ikut melihatnya.
// Dipakai oleh next.config.mjs (dev/start) dan electron/jalankan-server.js (bundel).
// Logika yang sama ada di src/server/auth/secret.ts untuk sisi Node.
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function pasangSecretSesi() {
  if (process.env.STM_SESSION_SECRET && process.env.STM_SESSION_SECRET.length >= 32) return
  const dataDir = path.resolve(process.env.STM_DATA_DIR || './data')
  const berkas = path.join(dataDir, '.secret')
  let secret = ''
  try {
    secret = fs.readFileSync(berkas, 'utf8').trim()
  } catch (_) {
    secret = ''
  }
  if (secret.length < 32) {
    fs.mkdirSync(dataDir, { recursive: true })
    secret = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(berkas, secret, { mode: 0o600 })
  }
  process.env.STM_SESSION_SECRET = secret
}

module.exports = { pasangSecretSesi }
