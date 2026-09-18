'use server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db, schema } from '@/server/db'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { buatSesi, hapusSesi } from '@/server/auth/session'
import {
  buatKodePemulihan,
  cocokKode,
  cocokPin,
  hashKode,
  hashPin,
  jedaKunciMs,
  kalimatJeda,
  pinMudahDitebak,
} from '@/server/auth/pin'
import { skemaPin } from '@/lib/validasi'
import { berhasil, gagal, type HasilAksi } from '@/lib/hasil'

type HasilKunci = HasilAksi<undefined> & { sisaDetik?: number }

function sisaKunciDetik(kunciSampai: number | null): number {
  if (!kunciSampai) return 0
  return Math.max(0, Math.ceil((kunciSampai - Date.now()) / 1000))
}

/** Mencatat satu kegagalan; pada kelipatan 5 memasang jeda di database (docs/02 §4.3). */
function catatGagal(gagalSebelumnya: number): { pesan: string; sisaDetik?: number } {
  const gagalLogin = gagalSebelumnya + 1
  const jeda = jedaKunciMs(gagalLogin)
  const kunciSampai = jeda ? Date.now() + jeda : null
  db.update(schema.pengaturan)
    .set({ gagalLogin, kunciSampai, diubahPada: Date.now() })
    .where(eq(schema.pengaturan.id, 1))
    .run()
  if (kunciSampai) {
    const sisa = sisaKunciDetik(kunciSampai)
    return { pesan: kalimatJeda(sisa), sisaDetik: sisa }
  }
  return { pesan: 'PIN salah. Coba lagi.' }
}

function nolkanGagal() {
  db.update(schema.pengaturan)
    .set({ gagalLogin: 0, kunciSampai: null, diubahPada: Date.now() })
    .where(eq(schema.pengaturan.id, 1))
    .run()
}

/** Membuka kunci dengan PIN (docs/02 §4.3). Berhasil → cookie sesi dibuat. */
export async function bukaKunci(pin: string): Promise<HasilKunci> {
  const p = ambilPengaturan()
  if (!p) return gagal('Pengaturan awal belum dilakukan.')

  const sisa = sisaKunciDetik(p.kunciSampai)
  if (sisa > 0) return { ...gagal(kalimatJeda(sisa)), sisaDetik: sisa }

  if (!skemaPin.safeParse(pin).success) return gagal('PIN harus 6 angka.')

  if (!(await cocokPin(pin, p.pinHash))) {
    const { pesan, sisaDetik } = catatGagal(p.gagalLogin)
    return sisaDetik ? { ...gagal(pesan), sisaDetik } : gagal(pesan)
  }

  nolkanGagal()
  await buatSesi(p.autoKunciMenit)
  return berhasil(undefined)
}

/** Tombol Kunci di header: hapus cookie, kembali ke layar PIN. */
export async function kunci(): Promise<never> {
  hapusSesi()
  redirect('/')
}

const skemaPulihkan = z.object({
  kode: z.string({ error: 'Kode pemulihan belum diisi.' }).trim().min(10, 'Kode pemulihan terdiri dari 10 huruf dan angka.'),
  pinBaru: skemaPin,
})

/**
 * Lupa PIN (docs/02 §4.5): kode pemulihan cocok → PIN diganti, kode lama dibatalkan,
 * kode baru ditampilkan sekali. Jeda percobaan gagal dibagi dengan login PIN.
 * Tidak membuat sesi (alasan sama seperti selesaikanSetup): sesi dibuat lewat bukaKunci()
 * setelah pengguna mengonfirmasi kode baru sudah disimpan.
 */
export async function pulihkanPin(input: { kode: string; pinBaru: string }): Promise<HasilAksi<{ kodePemulihan: string }> & { sisaDetik?: number }> {
  const p = ambilPengaturan()
  if (!p) return gagal('Pengaturan awal belum dilakukan.')

  const sisa = sisaKunciDetik(p.kunciSampai)
  if (sisa > 0) return { ...gagal(kalimatJeda(sisa)), sisaDetik: sisa }

  const hasil = skemaPulihkan.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
  }
  const { kode, pinBaru } = hasil.data
  if (pinMudahDitebak(pinBaru)) {
    return gagal('PIN ini terlalu mudah ditebak. Coba angka lain supaya catatan uang Anda aman.', 'pinBaru')
  }

  if (!(await cocokKode(kode, p.pemulihanHash))) {
    const { pesan, sisaDetik } = catatGagal(p.gagalLogin)
    const teks = sisaDetik ? pesan : 'Kode pemulihan tidak cocok. Periksa lagi huruf dan angkanya.'
    return sisaDetik ? { ...gagal(teks, 'kode'), sisaDetik } : gagal(teks, 'kode')
  }

  const kodeBaru = buatKodePemulihan()
  const [pinHash, pemulihanHash] = await Promise.all([hashPin(pinBaru), hashKode(kodeBaru)])
  db.update(schema.pengaturan)
    .set({ pinHash, pemulihanHash, gagalLogin: 0, kunciSampai: null, diubahPada: Date.now() })
    .where(eq(schema.pengaturan.id, 1))
    .run()

  return berhasil({ kodePemulihan: kodeBaru })
}
