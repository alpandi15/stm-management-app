'use server'
import { and, eq, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { skemaRt, type InputRt } from '@/lib/validasi'
import { berhasil, gagal } from '@/lib/hasil'

function segarkan() {
  revalidatePath('/anggota')
  revalidatePath('/anggota/rt')
}

function validasi(input: InputRt, kecualiId?: number) {
  const hasil = skemaRt.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { galat: gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString()) }
  }
  const d = hasil.data
  const kembar = db
    .select({ id: schema.rt.id })
    .from(schema.rt)
    .where(and(eq(schema.rt.nama, d.nama), kecualiId ? ne(schema.rt.id, kecualiId) : undefined))
    .get()
  if (kembar) return { galat: gagal(`${d.nama} sudah ada. Pakai nama lain atau ubah yang sudah ada.`, 'nama') }
  return { data: { nama: d.nama, keterangan: d.keterangan?.trim() || null, urutan: d.urutan ?? 0 } }
}

export const tambahRt = aksiTerlindungi(async (input: InputRt) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const baris = db.insert(schema.rt).values({ ...v.data!, dibuatPada: Date.now() }).returning().get()
  segarkan()
  return berhasil(baris)
})

export const ubahRt = aksiTerlindungi(async (id: number, input: InputRt) => {
  const v = validasi(input, id)
  if (v.galat) return v.galat
  const baris = db.update(schema.rt).set(v.data!).where(eq(schema.rt.id, id)).returning().get()
  if (!baris) return gagal('RT tidak ditemukan.')
  segarkan()
  return berhasil(baris)
})

/** RT yang masih dipakai anggota tidak bisa dihapus — pindahkan anggotanya dulu. */
export const hapusRt = aksiTerlindungi(async (id: number) => {
  const dipakai = db.select({ id: schema.anggota.id }).from(schema.anggota).where(eq(schema.anggota.rtId, id)).get()
  if (dipakai) return gagal('RT ini masih dipakai anggota. Pindahkan anggotanya ke RT lain dulu, baru hapus.')
  const baris = db.delete(schema.rt).where(eq(schema.rt.id, id)).returning().get()
  if (!baris) return gagal('RT tidak ditemukan.')
  segarkan()
  return berhasil(baris)
})
