import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { dataDir } from '../config'

// Kunci penanda cookie sesi (docs/02 §2.3): dibuat sekali saat pertama jalan, disimpan di
// STM_DATA_DIR/.secret. Tidak memakai .env karena aplikasi terbundel tidak punya tempat
// aman untuk itu dan pengguna tidak akan pernah mengisinya.
//
// next.config.mjs (dev/start) dan electron/jalankan-server.js (bundel) memasangnya ke
// process.env lebih dulu supaya middleware — yang berjalan di edge runtime tanpa akses
// berkas — juga bisa memakainya.
export function ambilSecret(): string {
  const dariEnv = process.env.STM_SESSION_SECRET
  if (dariEnv && dariEnv.length >= 32) return dariEnv

  const berkas = path.join(dataDir, '.secret')
  let secret: string
  try {
    secret = fs.readFileSync(berkas, 'utf8').trim()
  } catch {
    secret = ''
  }
  if (secret.length < 32) {
    fs.mkdirSync(dataDir, { recursive: true })
    secret = randomBytes(32).toString('hex')
    fs.writeFileSync(berkas, secret, { mode: 0o600 })
  }
  process.env.STM_SESSION_SECRET = secret
  return secret
}
