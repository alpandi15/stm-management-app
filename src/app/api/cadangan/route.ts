import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { adaSesi } from '@/server/auth/session'
import { cadangkanKe, namaCadanganBaru } from '@/server/services/cadangan'

export const dynamic = 'force-dynamic'

/** Unduh cadangan sebagai berkas (mode browser, docs/02 §8.2). Di Electron dipakai dialog simpan. */
export async function GET() {
  if (!(await adaSesi())) return new NextResponse('Kunci aplikasi terbuka dulu.', { status: 401 })
  const nama = namaCadanganBaru()
  const sementara = path.join(os.tmpdir(), `stm-${process.pid}-${Date.now()}.db`)
  try {
    cadangkanKe(sementara)
    const isi = fs.readFileSync(sementara)
    return new NextResponse(isi, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${nama}"`,
        'Content-Length': String(isi.length),
      },
    })
  } finally {
    fs.rmSync(sementara, { force: true })
  }
}
