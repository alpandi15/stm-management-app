// Melengkapi .next/standalone setelah `next build` (docs/03 §2):
// .next/static dan public tidak disalin Next; drizzle/ (migrasi) wajib ada untuk migrasi otomatis.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const akar = process.cwd()
const standalone = path.join(akar, '.next', 'standalone')
if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('Tidak ada .next/standalone/server.js — jalankan `next build` dulu.')
  process.exit(1)
}

const salin = (dari, ke) => {
  rmSync(ke, { recursive: true, force: true })
  mkdirSync(path.dirname(ke), { recursive: true })
  cpSync(dari, ke, { recursive: true })
  console.log(`✓ ${path.relative(akar, dari)} → ${path.relative(akar, ke)}`)
}

salin(path.join(akar, '.next', 'static'), path.join(standalone, '.next', 'static'))
salin(path.join(akar, 'public'), path.join(standalone, 'public'))
salin(path.join(akar, 'drizzle'), path.join(standalone, 'drizzle'))

// Cache Next tidak perlu ikut ke bundel
rmSync(path.join(standalone, '.next', 'cache'), { recursive: true, force: true })
