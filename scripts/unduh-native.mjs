// Mengunduh prebuild better-sqlite3 untuk Electron 22 (ABI 110) Windows ia32 dan x64
// (docs/03 §4, docs/05 §2). better-sqlite3 di .next/standalone dikompilasi untuk mesin
// pengembang; berkas .node hasil unduhan ini menggantikannya per arsitektur saat
// electron-builder mengemas (lihat extraResources di package.json).
// Butuh internet sekali; hasilnya disimpan di build/native/<platform>-<arch>/.
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { get } from 'node:https'

const require = createRequire(import.meta.url)
const versiBs3 = require('better-sqlite3/package.json').version
const abi = process.env.STM_ELECTRON_ABI || '110' // Electron 22 (docs/05 §2)
const target = (process.argv[2] || 'win32-ia32,win32-x64').split(',')

function unduh(url, tujuan, sisa = 5) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'stm-kas-build' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && sisa > 0) {
        res.resume()
        return unduh(res.headers.location, tujuan, sisa - 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} untuk ${url}`))
      }
      const f = createWriteStream(tujuan)
      res.pipe(f)
      f.on('finish', () => f.close(resolve))
      f.on('error', reject)
    }).on('error', reject)
  })
}

for (const t of target) {
  const [platform, arch] = t.split('-')
  const folder = path.join('build', 'native', `${platform}-${arch}`)
  const hasil = path.join(folder, 'better_sqlite3.node')
  if (existsSync(hasil)) {
    console.log(`✓ ${t}: sudah ada (${hasil})`)
    continue
  }
  mkdirSync(folder, { recursive: true })
  const nama = `better-sqlite3-v${versiBs3}-electron-v${abi}-${platform}-${arch}.tar.gz`
  const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${versiBs3}/${nama}`
  const tar = path.join(folder, nama)
  console.log(`⇣ ${url}`)
  await unduh(url, tar)
  // Isi tarball: build/Release/better_sqlite3.node
  execFileSync('tar', ['-xzf', nama], { cwd: folder, stdio: 'inherit' })
  renameSync(path.join(folder, 'build', 'Release', 'better_sqlite3.node'), hasil)
  rmSync(path.join(folder, 'build'), { recursive: true, force: true })
  rmSync(tar, { force: true })
  console.log(`✓ ${t}: ${hasil}`)
}
