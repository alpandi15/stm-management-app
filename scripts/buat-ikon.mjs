// Membuat favicon.ico dan build/icon.ico dari src/assets/logo-app.png.
// Memakai `sips` (bawaan macOS) untuk mengubah ukuran, lalu mengemas PNG ke dalam ICO
// (entri PNG di ICO didukung Windows sejak Vista, termasuk Windows 7).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const sumber = 'src/assets/logo-app.png'
const ukuran = [16, 24, 32, 48, 64, 128, 256]
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ikon-'))

const png = ukuran.map((u) => {
  const keluar = path.join(tmp, `${u}.png`)
  execFileSync('sips', ['-z', String(u), String(u), sumber, '--out', keluar], { stdio: 'ignore' })
  return { u, data: fs.readFileSync(keluar) }
})

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // tipe: ikon
header.writeUInt16LE(png.length, 4)
let offset = 6 + 16 * png.length
const entri = []
const isi = []
for (const { u, data } of png) {
  const e = Buffer.alloc(16)
  e.writeUInt8(u === 256 ? 0 : u, 0)
  e.writeUInt8(u === 256 ? 0 : u, 1)
  e.writeUInt8(0, 2) // palet
  e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4) // planes
  e.writeUInt16LE(32, 6) // bit per piksel
  e.writeUInt32LE(data.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += data.length
  entri.push(e)
  isi.push(data)
}
const ico = Buffer.concat([header, ...entri, ...isi])
for (const tujuan of ['src/app/favicon.ico', 'build/icon.ico']) {
  fs.mkdirSync(path.dirname(tujuan), { recursive: true })
  fs.writeFileSync(tujuan, ico)
  console.log(`${tujuan}: ${(ico.length / 1024).toFixed(0)} KB, ${png.length} ukuran`)
}
// icon.png untuk tab browser: Next menambahkan hash isi ke URL-nya sehingga tidak
// tertahan cache seperti favicon.ico. apple-icon.png untuk layar utama iOS.
const png256 = png.find((p) => p.u === 256).data
fs.writeFileSync('src/app/icon.png', png256)
fs.writeFileSync('src/app/apple-icon.png', png256)
console.log('src/app/icon.png & apple-icon.png: 256px')
fs.rmSync(tmp, { recursive: true, force: true })
