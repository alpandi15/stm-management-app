// Bagian sesi yang murni JavaScript — dipakai di middleware (edge) dan di server Node.
// Tidak boleh mengimpor fs, database, atau modul Node lain.
import { SignJWT, jwtVerify } from 'jose'

export const NAMA_COOKIE = 'stm_sesi'
const ALG = 'HS256'

/** Isi token: versi dan lama kunci otomatis (menit), tanpa data pribadi (docs/02 §4.4). */
export type IsiSesi = { v: 1; m: number }

function kunci(secret: string) {
  return new TextEncoder().encode(secret)
}

export async function buatToken(secret: string, menit: number): Promise<string> {
  const isi: IsiSesi = { v: 1, m: menit }
  return new SignJWT(isi)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${menit}m`)
    .sign(kunci(secret))
}

/** Mengembalikan isi sesi bila token sah dan belum kedaluwarsa; selain itu null. */
export async function bacaToken(secret: string, token: string): Promise<IsiSesi | null> {
  try {
    const { payload } = await jwtVerify(token, kunci(secret), { algorithms: [ALG] })
    if (payload.v !== 1 || typeof payload.m !== 'number') return null
    return { v: 1, m: payload.m }
  } catch {
    return null
  }
}

/** Atribut cookie sesi: httpOnly, lax, tanpa `secure` karena berjalan di http://localhost. */
export function atributCookie(menit: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: false,
    path: '/',
    maxAge: menit * 60,
  }
}
