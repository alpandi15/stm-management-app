'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { skemaAnggota, type InputAnggota } from '@/lib/validasi'
import { berhasil, gagal } from '@/lib/hasil'

function validasi(input: InputAnggota) {
  const hasil = skemaAnggota.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { galat: gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString()) }
  }
  return { data: { nama: hasil.data.nama, noHp: hasil.data.noHp?.trim() || null, alamat: hasil.data.alamat?.trim() || null } }
}

export const tambahAnggota = aksiTerlindungi(async (input: InputAnggota) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const baris = db.insert(schema.anggota).values({ ...v.data!, aktif: true, dibuatPada: Date.now() }).returning().get()
  revalidatePath('/anggota')
  return berhasil(baris)
})

export const ubahAnggota = aksiTerlindungi(async (id: number, input: InputAnggota) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const baris = db.update(schema.anggota).set(v.data!).where(eq(schema.anggota.id, id)).returning().get()
  if (!baris) return gagal('Anggota tidak ditemukan.')
  revalidatePath('/anggota')
  return berhasil(baris)
})

export const aturAktifAnggota = aksiTerlindungi(async (id: number, aktif: boolean) => {
  const baris = db.update(schema.anggota).set({ aktif }).where(eq(schema.anggota.id, id)).returning().get()
  if (!baris) return gagal('Anggota tidak ditemukan.')
  revalidatePath('/anggota')
  return berhasil(baris)
})

/** Hapus permanen hanya bila belum pernah dipakai catatan; selain itu sarankan nonaktifkan. */
export const hapusAnggota = aksiTerlindungi(async (id: number) => {
  try {
    db.delete(schema.anggota).where(eq(schema.anggota.id, id)).run()
  } catch (e) {
    if (String(e).includes('FOREIGN KEY')) {
      return gagal('Anggota ini sudah dipakai di catatan kas, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak muncul di pilihan.')
    }
    throw e
  }
  revalidatePath('/anggota')
  return berhasil(undefined)
})
