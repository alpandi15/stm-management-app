// Hook afterPack electron-builder: menaruh better_sqlite3.node yang cocok dengan platform
// dan arsitektur TARGET ke dalam resources/standalone (docs/03 §4).
// Tidak memakai makro ${platform} di extraResources: makro itu mengembalikan platform
// mesin pembangun (darwin di Mac), bukan target — paket Windows jadi tanpa berkas .node.
'use strict'
const fs = require('fs')
const path = require('path')

const NAMA_ARCH = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64' }

module.exports = async function pasangNative(context) {
  const platform = context.electronPlatformName // win32 | darwin | linux
  const arch = NAMA_ARCH[context.arch]
  const sumber = path.join(__dirname, '..', 'build', 'native', `${platform}-${arch}`, 'better_sqlite3.node')
  if (!fs.existsSync(sumber)) {
    throw new Error(`Prebuild better-sqlite3 untuk ${platform}-${arch} tidak ada di ${sumber}. Jalankan: npm run native:win`)
  }
  const resources = platform === 'darwin' ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources') : path.join(context.appOutDir, 'resources')
  const tujuan = path.join(resources, 'standalone', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
  fs.mkdirSync(path.dirname(tujuan), { recursive: true })
  fs.copyFileSync(sumber, tujuan)
  const ukuran = fs.statSync(tujuan).size
  if (ukuran < 100000) throw new Error(`better_sqlite3.node ${platform}-${arch} tersalin tapi ukurannya mencurigakan (${ukuran} byte)`)
  console.log(`  • pasang native   ${platform}-${arch} → ${path.relative(process.cwd(), tujuan)} (${(ukuran / 1048576).toFixed(1)} MB)`)
}
