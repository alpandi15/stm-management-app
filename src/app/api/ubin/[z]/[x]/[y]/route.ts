import { NextResponse } from 'next/server'
import { ambilUbin, ubinValid } from '@/server/services/ubin'

export const dynamic = 'force-dynamic'

/** Ubin OpenStreetMap lewat server + cache di folder data (lihat services/ubin.ts). */
export async function GET(_req: Request, { params }: { params: { z: string; x: string; y: string } }) {
  const z = Number(params.z)
  const x = Number(params.x)
  const y = Number(params.y.replace(/\.png$/, ''))
  if (!ubinValid(z, x, y)) return new NextResponse('Ubin tidak dikenali.', { status: 400 })
  const isi = await ambilUbin(z, x, y)
  if (!isi) return new NextResponse('Ubin belum tersedia (tanpa internet).', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return new NextResponse(new Uint8Array(isi), { headers: { 'Content-Type': 'image/png', 'Content-Length': String(isi.length), 'Cache-Control': 'public, max-age=604800' } })
}
