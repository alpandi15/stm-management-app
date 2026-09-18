import fs from 'node:fs'
import { NextResponse } from 'next/server'
import { adaSesi } from '@/server/auth/session'
import { pathBukti } from '@/server/services/bukti'

export const dynamic = 'force-dynamic'

const TIPE: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

/** Menyajikan foto bukti dari folder data (docs/02 §9). Nama berkas diperiksa ketat. */
export async function GET(_req: Request, { params }: { params: { nama: string } }) {
  if (!(await adaSesi())) return new NextResponse('Kunci aplikasi terbuka dulu.', { status: 401 })
  const p = pathBukti(params.nama)
  if (!p || !fs.existsSync(p)) return new NextResponse('Foto tidak ditemukan.', { status: 404 })
  const isi = fs.readFileSync(p)
  const ekstensi = params.nama.slice(params.nama.lastIndexOf('.') + 1)
  return new NextResponse(isi, {
    headers: {
      'Content-Type': TIPE[ekstensi] ?? 'application/octet-stream',
      'Content-Length': String(isi.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
