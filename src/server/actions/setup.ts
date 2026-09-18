'use server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema, sqlite } from '@/server/db'
import { seedJenisBawaan } from '@/server/db/seed'
import { buatKodePemulihan, hashKode, hashPin, pinMudahDitebak } from '@/server/auth/pin'
import { skemaNama, skemaPin } from '@/lib/validasi'
import { hariIni } from '@/lib/tanggal'
import { berhasil, gagal, type HasilAksi } from '@/lib/hasil'

const skemaSetup = z.object({
  namaStm: skemaNama,
  namaBendahara: skemaNama,
  pin: skemaPin,
})
export type InputSetup = z.infer<typeof skemaSetup>

const PESAN_PIN_MUDAH = 'PIN ini terlalu mudah ditebak. Coba angka lain supaya catatan uang Anda aman.'

/**
 * Pengaturan awal (docs/02 §4.2). Hanya berhasil bila baris pengaturan belum ada —
 * pengalihan di halaman /setup hanya kenyamanan; penolakan di sini yang menentukan.
 * Kode pemulihan dikembalikan terang SEKALI di sini dan tidak pernah lagi.
 *
 * Sengaja TIDAK membuat sesi: Server Action yang memasang cookie membuat Next
 * me-refresh halaman, /setup lalu mengalihkan ke /beranda, dan layar kode pemulihan
 * terlewati sebelum sempat dibaca. Sesi dibuat lewat bukaKunci(pin) saat pengguna
 * menekan "Lanjut ke Beranda" setelah mencentang "Saya sudah menyimpannya".
 */
export async function selesaikanSetup(input: InputSetup): Promise<HasilAksi<{ kodePemulihan: string }>> {
  const hasil = skemaSetup.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
  }
  const { namaStm, namaBendahara, pin } = hasil.data
  if (pinMudahDitebak(pin)) return gagal(PESAN_PIN_MUDAH, 'pin')

  const kodePemulihan = buatKodePemulihan()
  const [pinHash, pemulihanHash] = await Promise.all([hashPin(pin), hashKode(kodePemulihan)])
  const sekarang = Date.now()

  // Satu transaksi SQLite: pemeriksaan "belum ada" dan penyisipan tidak boleh terpisah.
  const tersimpan = sqlite.transaction(() => {
    const ada = db.select({ id: schema.pengaturan.id }).from(schema.pengaturan).where(eq(schema.pengaturan.id, 1)).get()
    if (ada) return false
    db.insert(schema.pengaturan)
      .values({
        id: 1,
        namaStm,
        namaBendahara,
        saldoAwal: 0,
        tanggalMulai: hariIni(),
        pinHash,
        pemulihanHash,
        gagalLogin: 0,
        autoKunciMenit: 15,
        tema: 'sistem',
        dibuatPada: sekarang,
        diubahPada: sekarang,
      })
      .run()
    seedJenisBawaan(db)
    return true
  })()

  if (!tersimpan) {
    return gagal('Pengaturan awal sudah pernah dilakukan. Buka aplikasi dengan PIN Anda.')
  }

  return berhasil({ kodePemulihan })
}
