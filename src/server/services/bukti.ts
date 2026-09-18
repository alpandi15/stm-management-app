import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { dataDir } from '@/server/config'
import { GalatPengguna } from '@/server/galat'
import { BUKTI_MAKS_BYTE } from '@/lib/validasi'

/** Folder foto bukti (docs/02 §9): di folder data, bukan di public/ yang baca-saja setelah dipaket. */
export const buktiDir = path.join(dataDir, 'bukti')

const EKSTENSI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Nama berkas yang sah: UUID + ekstensi gambar. Menolak `..`, pemisah path, dan apa pun di luar pola. */
export function namaBuktiSah(nama: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(nama)
}

export function pathBukti(nama: string): string | null {
  return namaBuktiSah(nama) ? path.join(buktiDir, nama) : null
}

/**
 * Menyimpan berkas bukti dari FormData. Menerima objek mirip Blob (undici di Node 16
 * tidak memasang `File` global, jadi jangan memakai `instanceof File`).
 */
export async function simpanBukti(berkas: unknown): Promise<string> {
  if (!berkas || typeof berkas !== 'object' || !('arrayBuffer' in berkas) || !('type' in berkas)) {
    throw new GalatPengguna('Berkas foto tidak terbaca. Coba pilih ulang.', 'buktiFile')
  }
  const blob = berkas as { arrayBuffer(): Promise<ArrayBuffer>; type: string; size: number }
  const ekstensi = EKSTENSI[blob.type]
  if (!ekstensi) throw new GalatPengguna('Foto bukti harus berupa gambar JPG, PNG, atau WebP.', 'buktiFile')
  if (blob.size > BUKTI_MAKS_BYTE) throw new GalatPengguna('Foto bukti terlalu besar. Maksimal 5 MB.', 'buktiFile')

  fs.mkdirSync(buktiDir, { recursive: true })
  const nama = `${randomUUID()}.${ekstensi}`
  fs.writeFileSync(path.join(buktiDir, nama), Buffer.from(await blob.arrayBuffer()))
  return nama
}

export function hapusBerkasBukti(nama: string): void {
  const p = pathBukti(nama)
  if (p) fs.rmSync(p, { force: true })
}
