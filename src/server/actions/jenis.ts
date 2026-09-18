'use server'
import { asc, eq, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { skemaJenis, type InputJenis } from '@/lib/validasi'
import { berhasil, gagal } from '@/lib/hasil'

function segarkan() {
  revalidatePath('/pengaturan')
  revalidatePath('/catatan')
  revalidatePath('/laporan')
}

/**
 * Kode jenis buatan pengguna: UMxx / UKxx — ruang terpisah dari kode bawaan PMxx/PKxx,
 * supaya jenis bawaan yang ditambahkan pembaruan aplikasi (PM10, PM11, …) tidak pernah
 * bentrok dengan kode yang sudah dipakai pengguna.
 */
function kodeBerikutnya(arah: 'masuk' | 'keluar'): string {
  const awalan = arah === 'masuk' ? 'UM' : 'UK'
  const semua = db.select({ kode: schema.jenis.kode }).from(schema.jenis).all().map((j) => j.kode)
  let n = 0
  for (const k of semua) if (k.startsWith(awalan)) n = Math.max(n, Number(k.slice(2)) || 0)
  return `${awalan}${String(n + 1).padStart(2, '0')}`
}

/**
 * Nilai turunan yang ditegakkan di server (Spec 2 §A4, §B5): penanda meninggal hanya untuk
 * uang keluar (uang masuk dipaksa false walau dikirim paksa), kunci nominal dipaksa false
 * bila nominal kosong.
 */
function nilaiJenis(d: InputJenis) {
  const nominalBawaan = d.nominalBawaan ?? null
  return {
    nama: d.nama,
    keterangan: d.keterangan?.trim() || null,
    nominalBawaan,
    nominalDikunci: nominalBawaan != null && !!d.nominalDikunci,
    periode: d.periode ?? 'bebas',
    menandaiMeninggal: d.arah === 'keluar' && !!d.menandaiMeninggal,
  }
}

export const tambahJenis = aksiTerlindungi(async (input: InputJenis) => {
  const hasil = skemaJenis.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
  }
  const urutan = (db.select({ m: max(schema.jenis.urutan) }).from(schema.jenis).get()?.m ?? 0) + 1
  const baris = db
    .insert(schema.jenis)
    .values({ kode: kodeBerikutnya(hasil.data.arah), arah: hasil.data.arah, ...nilaiJenis(hasil.data), urutan, aktif: true, bawaan: false })
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

/**
 * Ubah nama, keterangan, nominal, kunci, periode, penanda. Arah tidak bisa diubah: catatan
 * lama menyalin arah dari jenis ini. Mengubah nominal TIDAK mengubah catatan yang sudah ada.
 */
export const ubahJenis = aksiTerlindungi(async (id: number, input: Omit<InputJenis, 'arah'>) => {
  const lama = db.select().from(schema.jenis).where(eq(schema.jenis.id, id)).get()
  if (!lama) return gagal('Jenis tidak ditemukan.')
  const hasil = skemaJenis.safeParse({ ...input, arah: lama.arah })
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
  }
  const baris = db.update(schema.jenis).set(nilaiJenis(hasil.data)).where(eq(schema.jenis.id, id)).returning().get()
  segarkan()
  return berhasil(baris)
})

export const aturAktifJenis = aksiTerlindungi(async (id: number, aktif: boolean) => {
  const baris = db.update(schema.jenis).set({ aktif }).where(eq(schema.jenis.id, id)).returning().get()
  if (!baris) return gagal('Jenis tidak ditemukan.')
  segarkan()
  return berhasil(baris)
})

/**
 * Hapus: jenis bawaan ditolak di server (bukan hanya tombol dinonaktifkan), dan jenis yang
 * sudah dipakai catatan ditolak lewat galat kunci asing → pesan yang menyarankan nonaktifkan.
 */
export const hapusJenis = aksiTerlindungi(async (id: number) => {
  const j = db.select().from(schema.jenis).where(eq(schema.jenis.id, id)).get()
  if (!j) return gagal('Jenis tidak ditemukan.')
  if (j.bawaan) return gagal('Jenis bawaan tidak bisa dihapus. Nonaktifkan saja bila tidak dipakai.')
  try {
    db.delete(schema.jenis).where(eq(schema.jenis.id, id)).run()
  } catch (e) {
    if (String(e).includes('FOREIGN KEY')) {
      return gagal('Jenis ini sudah dipakai di catatan kas, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak muncul di pilihan.')
    }
    throw e
  }
  segarkan()
  return berhasil(undefined)
})

export const daftarSemuaJenis = aksiTerlindungi(async () => berhasil(db.select().from(schema.jenis).orderBy(asc(schema.jenis.urutan)).all()))
