'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { buatKodePemulihan, cocokPin, hashKode, hashPin, pinMudahDitebak } from '@/server/auth/pin'
import { TEMA, type Tema } from '@/server/db/schema'
import { skemaNama, skemaPin } from '@/lib/validasi'
import { apakahISO } from '@/lib/tanggal'
import { berhasil, gagal } from '@/lib/hasil'

function simpan(nilai: Partial<typeof schema.pengaturan.$inferInsert>) {
  db.update(schema.pengaturan)
    .set({ ...nilai, diubahPada: Date.now() })
    .where(eq(schema.pengaturan.id, 1))
    .run()
}

function pesanZod(e: z.ZodError) {
  const isu = e.issues[0]
  return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
}

export const aturTema = aksiTerlindungi(async (tema: Tema) => {
  if (!TEMA.includes(tema)) return gagal('Pilihan tampilan tidak dikenali.')
  simpan({ tema })
  revalidatePath('/', 'layout')
  return berhasil(undefined)
})

const skemaIdentitas = z.object({
  namaStm: skemaNama,
  alamat: z.string().trim().max(255, 'Alamat terlalu panjang.').nullable().optional(),
  namaBendahara: skemaNama,
  namaKetua: z.string().trim().max(120, 'Nama terlalu panjang.').nullable().optional(),
})
export type InputIdentitas = z.infer<typeof skemaIdentitas>

export const simpanIdentitas = aksiTerlindungi(async (input: InputIdentitas) => {
  const h = skemaIdentitas.safeParse(input)
  if (!h.success) return pesanZod(h.error)
  simpan({ namaStm: h.data.namaStm, alamat: h.data.alamat?.trim() || null, namaBendahara: h.data.namaBendahara, namaKetua: h.data.namaKetua?.trim() || null })
  revalidatePath('/', 'layout')
  return berhasil(undefined)
})

const skemaSaldoAwal = z.object({
  saldoAwal: z.number({ error: 'Saldo awal belum diisi.' }).int('Saldo awal harus bilangan bulat.').min(-999_999_999_999).max(999_999_999_999),
  tanggalMulai: z.string().refine(apakahISO, 'Tanggal mulai tidak dikenali.'),
})

/** Mengubah saldo awal / tanggal mulai mengubah semua laporan — peringatan ada di layar. */
export const simpanSaldoAwal = aksiTerlindungi(async (input: { saldoAwal: number; tanggalMulai: string }) => {
  const h = skemaSaldoAwal.safeParse(input)
  if (!h.success) return pesanZod(h.error)
  simpan({ saldoAwal: h.data.saldoAwal, tanggalMulai: h.data.tanggalMulai })
  revalidatePath('/', 'layout')
  return berhasil(undefined)
})

const PESAN_PIN_MUDAH = 'PIN ini terlalu mudah ditebak. Coba angka lain supaya catatan uang Anda aman.'

/** Ganti PIN meminta PIN lama (docs/04 Fase 8). */
export const gantiPin = aksiTerlindungi(async (input: { pinLama: string; pinBaru: string }) => {
  const p = ambilPengaturan()
  if (!p) return gagal('Pengaturan tidak ditemukan.')
  if (!skemaPin.safeParse(input.pinLama).success) return gagal('PIN lama harus 6 angka.', 'pinLama')
  if (!skemaPin.safeParse(input.pinBaru).success) return gagal('PIN baru harus 6 angka.', 'pinBaru')
  if (pinMudahDitebak(input.pinBaru)) return gagal(PESAN_PIN_MUDAH, 'pinBaru')
  if (!(await cocokPin(input.pinLama, p.pinHash))) return gagal('PIN lama salah.', 'pinLama')
  simpan({ pinHash: await hashPin(input.pinBaru) })
  return berhasil(undefined)
})

/** Buat ulang kode pemulihan: butuh PIN, kode lama batal, kode baru dikembalikan sekali. */
export const buatUlangKodePemulihan = aksiTerlindungi(async (pin: string) => {
  const p = ambilPengaturan()
  if (!p) return gagal('Pengaturan tidak ditemukan.')
  if (!(await cocokPin(pin, p.pinHash))) return gagal('PIN salah.', 'pin')
  const kode = buatKodePemulihan()
  simpan({ pemulihanHash: await hashKode(kode) })
  return berhasil({ kodePemulihan: kode })
})

const MENIT_DIIZINKAN = [5, 15, 30, 60] as const

export const aturAutoKunci = aksiTerlindungi(async (menit: number) => {
  if (!(MENIT_DIIZINKAN as readonly number[]).includes(menit)) return gagal('Pilihan waktu tidak dikenali.')
  simpan({ autoKunciMenit: menit })
  revalidatePath('/pengaturan')
  return berhasil(undefined)
})

/** Penguncian periode (docs/02 §5.5): null berarti dibuka. */
export const aturPenguncian = aksiTerlindungi(async (sampai: string | null) => {
  if (sampai !== null && !apakahISO(sampai)) return gagal('Tanggal tidak dikenali.', 'sampai')
  simpan({ terkunciSampai: sampai })
  revalidatePath('/', 'layout')
  return berhasil(undefined)
})
