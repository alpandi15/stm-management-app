import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { dataDir } from '../config'

// Ubin peta OpenStreetMap lewat server (docs/02 §5.1d). Dua alasan:
// 1. Chromium 108 di Windows 7 memverifikasi sertifikat lewat toko sertifikat Windows;
//    Windows 7 yang jarang diperbarui tidak punya akar Let's Encrypt (ISRG Root X1) yang
//    dipakai tile.openstreetmap.org, sehingga ubin gagal dimuat dan peta kosong.
//    Node (biner Electron dalam mode Node) membawa toko akar sendiri, jadi dari sini lolos.
// 2. Ubin disimpan di folder data: peta yang pernah dibuka tetap tampil tanpa internet.
const folderUbin = path.join(dataDir, 'ubin')
const UA = 'AplikasiKasSTM/0.1 (aplikasi desktop pembukuan STM; tanpa penyebaran massal)'
const ZOOM_MAKS = 19

export function ubinValid(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger)) return false
  if (z < 0 || z > ZOOM_MAKS) return false
  const n = 2 ** z
  return x >= 0 && x < n && y >= 0 && y < n
}

function unduh(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'image/png' }, timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return resolve(null)
      }
      const potongan: Buffer[] = []
      res.on('data', (d: Buffer) => potongan.push(d))
      res.on('end', () => resolve(Buffer.concat(potongan)))
      res.on('error', () => resolve(null))
    })
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })
}

/** Ubin dari cache bila ada; kalau tidak, unduh lalu simpan. null = tidak tersedia (offline). */
export async function ambilUbin(z: number, x: number, y: number): Promise<Buffer | null> {
  const berkas = path.join(folderUbin, String(z), String(x), `${y}.png`)
  try {
    return fs.readFileSync(berkas)
  } catch {
    /* belum ada di cache */
  }
  const isi = await unduh(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`)
  if (!isi) return null
  try {
    fs.mkdirSync(path.dirname(berkas), { recursive: true })
    fs.writeFileSync(berkas, isi)
  } catch {
    /* cache gagal ditulis — ubin tetap dikirim */
  }
  return isi
}
