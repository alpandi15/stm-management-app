import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ambilSecret } from './secret'
import { NAMA_COOKIE, atributCookie, bacaToken, buatToken } from './token'
import type { HasilAksi } from '@/lib/hasil'

/** Membuat cookie sesi baru. Hanya boleh dipanggil dari Server Action / Route Handler. */
export async function buatSesi(autoKunciMenit: number): Promise<void> {
  const token = await buatToken(ambilSecret(), autoKunciMenit)
  cookies().set(NAMA_COOKIE, token, atributCookie(autoKunciMenit))
}

export function hapusSesi(): void {
  cookies().set(NAMA_COOKIE, '', { ...atributCookie(0), maxAge: 0 })
}

/** true bila cookie sesi ada dan sah. */
export async function adaSesi(): Promise<boolean> {
  const token = cookies().get(NAMA_COOKIE)?.value
  if (!token) return false
  return (await bacaToken(ambilSecret(), token)) !== null
}

/** Dipanggil di awal setiap halaman terlindungi: tanpa sesi → ke layar kunci. */
export async function wajibSesi(): Promise<void> {
  if (!(await adaSesi())) redirect('/')
}

/**
 * Pembungkus Server Action (docs/02 §10): memastikan sesi sah sebelum fungsi dijalankan,
 * dan mengubah galat tak terduga menjadi pesan yang bisa dibaca — bukan layar merah.
 */
export function aksiTerlindungi<A extends unknown[], T>(
  fn: (...args: A) => Promise<HasilAksi<T>>,
): (...args: A) => Promise<HasilAksi<T>> {
  return async (...args: A) => {
    if (!(await adaSesi())) {
      return { ok: false, pesan: 'Sesi sudah berakhir. Buka kunci aplikasi lalu coba lagi.' }
    }
    try {
      return await fn(...args)
    } catch (e) {
      console.error('[aksi]', e)
      return { ok: false, pesan: 'Terjadi kesalahan yang tidak terduga. Coba ulangi sekali lagi.' }
    }
  }
}
