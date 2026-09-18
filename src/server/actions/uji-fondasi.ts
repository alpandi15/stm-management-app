'use server'
// Server Action sementara Fase 1: membuktikan jalur mutasi (FormData → Zod → SQLite)
// berjalan di runtime Electron 22 / Node 16. Dihapus pada Fase 2.
import { count } from 'drizzle-orm'
import { db, schema } from '@/server/db'
import { skemaJumlah } from '@/lib/validasi'
import { terbilangRupiah } from '@/lib/rupiah'

export async function ujiTerbilang(formData: FormData) {
  const hasil = skemaJumlah.safeParse(Number(formData.get('jumlah')))
  if (!hasil.success) return { ok: false as const, pesan: hasil.error.issues[0]?.message ?? 'Tidak sah.' }
  const totalJenis = db.select({ n: count() }).from(schema.jenis).get()?.n ?? 0
  return { ok: true as const, data: { terbilang: terbilangRupiah(hasil.data), totalJenis } }
}
