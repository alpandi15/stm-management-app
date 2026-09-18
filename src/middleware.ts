import { NextResponse, type NextRequest } from 'next/server'
import { NAMA_COOKIE, atributCookie, bacaToken, buatToken } from '@/server/auth/token'

// Middleware di Next 14 berjalan di edge runtime: tidak bisa membuka SQLite atau membaca
// berkas. Tugasnya satu: memperpanjang cookie sesi yang sah pada setiap navigasi, supaya
// kunci otomatis terjadi karena tidak ada aktivitas, bukan karena batas waktu mutlak
// (docs/02 §4.4). Cookie yang tidak sah DIBIARKAN — keputusan ada di server (wajibSesi).
// Menghapusnya di sini berbahaya: bila kunci yang dilihat middleware sempat berbeda dari
// kunci server, setiap PIN benar akan terpental balik ke layar kunci.
//
// Middleware sengaja TIDAK mengalihkan ke layar kunci. NextURL milik Next mengganti
// "127.0.0.1" menjadi "localhost" pada setiap pengalihan, dan di Electron (yang memuat
// 127.0.0.1) itu berarti pindah origin — cookie sesi tidak ikut. Pengalihan dilakukan
// wajibSesi() di halaman, yang menghasilkan Location relatif dan aman.
// Setiap Server Action memeriksa sesi sendiri lewat aksiTerlindungi().

let sudahPeringatkan = false

export async function middleware(req: NextRequest) {
  const secret = process.env.STM_SESSION_SECRET
  if (!secret) {
    // Tidak ada kunci di lingkungan ini (mis. `next start` manual tanpa pembungkus).
    if (!sudahPeringatkan) {
      sudahPeringatkan = true
      console.warn('[middleware] STM_SESSION_SECRET tidak ada; sesi tidak diperpanjang otomatis.')
    }
    return NextResponse.next()
  }

  const token = req.cookies.get(NAMA_COOKIE)?.value
  if (!token) return NextResponse.next()

  const sesi = await bacaToken(secret, token)
  if (!sesi) return NextResponse.next()
  const res = NextResponse.next()
  res.cookies.set(NAMA_COOKIE, await buatToken(secret, sesi.m), atributCookie(sesi.m))
  return res
}

export const config = {
  // Semua halaman kecuali route handler dan aset Next
  matcher: ['/((?!api/|_next/|favicon\\.ico).*)'],
}
