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

/** Kode jenis buatan pengguna: PMxx / PKxx melanjutkan nomor terakhir. */
function kodeBerikutnya(arah: 'masuk' | 'keluar'): string {
  const awalan = arah === 'masuk' ? 'PM' : 'PK'
  const semua = db.select({ kode: schema.jenis.kode }).from(schema.jenis).all().map((j) => j.kode)
  let n = 0
  for (const k of semua) if (k.startsWith(awalan)) n = Math.max(n, Number(k.slice(2)) || 0)
  return `${awalan}${String(n + 1).padStart(2, '0')}`
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
    .values({ kode: kodeBerikutnya(hasil.data.arah), nama: hasil.data.nama, arah: hasil.data.arah, keterangan: hasil.data.keterangan?.trim() || null, urutan, aktif: true, bawaan: false })
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

/** Ubah nama/keterangan. Arah tidak bisa diubah: catatan lama menyalin arah dari jenis ini. */
export const ubahJenis = aksiTerlindungi(async (id: number, input: { nama: string; keterangan?: string | null }) => {
  const hasil = skemaJenis.pick({ nama: true, keterangan: true }).safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString())
  }
  const baris = db
    .update(schema.jenis)
    .set({ nama: hasil.data.nama, keterangan: hasil.data.keterangan?.trim() || null })
    .where(eq(schema.jenis.id, id))
    .returning()
    .get()
  if (!baris) return gagal('Jenis tidak ditemukan.')
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
