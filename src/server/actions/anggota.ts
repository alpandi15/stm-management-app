'use server'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { and, isNull, ne } from 'drizzle-orm'
import { sqlite } from '@/server/db'
import { ambilAnggota } from '@/server/queries/anggota'
import { skemaAnggota, skemaKeluarga, type InputAnggota, type InputKeluarga } from '@/lib/validasi'
import { hariIni } from '@/lib/tanggal'
import { berhasil, gagal } from '@/lib/hasil'

function segarkan() {
  revalidatePath('/anggota')
  revalidatePath('/catatan')
}

function validasi(input: InputAnggota) {
  const hasil = skemaAnggota.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { galat: gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString()) }
  }
  const d = hasil.data
  const status = d.status ?? 'aktif'
  return {
    data: {
      nomor: d.nomor?.trim() || null,
      nama: d.nama,
      noHp: d.noHp?.trim() || null,
      alamat: d.alamat?.trim() || null,
      lat: d.lat ?? null,
      lng: d.lng ?? null,
      status,
      tanggalMeninggal: status === 'meninggal' ? (d.tanggalMeninggal ?? null) : null,
    },
  }
}

function nomorKembar(nomor: string | null, kecualiId?: number): boolean {
  if (!nomor) return false
  return !!db
    .select({ id: schema.anggota.id })
    .from(schema.anggota)
    .where(and(eq(schema.anggota.nomor, nomor), kecualiId ? ne(schema.anggota.id, kecualiId) : undefined))
    .get()
}

export const tambahAnggota = aksiTerlindungi(async (input: InputAnggota) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  if (nomorKembar(v.data!.nomor)) return gagal(`Nomor anggota ${v.data!.nomor} sudah dipakai anggota lain.`, 'nomor')
  const baris = db.insert(schema.anggota).values({ ...v.data!, aktif: true, dibuatPada: Date.now() }).returning().get()
  segarkan()
  return berhasil(baris)
})

/** Status yang diubah manual menjadi status manual: penanda catatan santunan dikosongkan (Spec 2 §A2). */
export const ubahAnggota = aksiTerlindungi(async (id: number, input: InputAnggota) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const lama = ambilAnggota(id)
  if (!lama) return gagal('Anggota tidak ditemukan.')
  if (nomorKembar(v.data!.nomor, id)) return gagal(`Nomor anggota ${v.data!.nomor} sudah dipakai anggota lain.`, 'nomor')
  const statusBerubah = lama.status !== v.data!.status || lama.tanggalMeninggal !== v.data!.tanggalMeninggal
  const baris = db
    .update(schema.anggota)
    .set({ ...v.data!, ...(statusBerubah ? { ditandaiOlehTransaksiId: null } : {}) })
    .where(eq(schema.anggota.id, id))
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

// ---------- Tanggungan (Spec 2 §A2) ----------

function validasiKeluarga(input: InputKeluarga) {
  const hasil = skemaKeluarga.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { galat: gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString()) }
  }
  const d = hasil.data
  if (d.tanggalLahir && d.tanggalLahir > hariIni()) return { galat: gagal('Tanggal lahir tidak boleh melebihi hari ini.', 'tanggalLahir') }
  if (d.tanggalMeninggal && d.tanggalMeninggal > hariIni()) return { galat: gagal('Tanggal meninggal tidak boleh melebihi hari ini.', 'tanggalMeninggal') }
  return {
    data: {
      nama: d.nama,
      hubungan: d.hubungan,
      tanggalLahir: d.tanggalLahir || null,
      status: d.status,
      tanggalMeninggal: d.status === 'meninggal' ? (d.tanggalMeninggal ?? null) : null,
      keterangan: d.keterangan?.trim() || null,
    },
  }
}

export const tambahKeluarga = aksiTerlindungi(async (anggotaId: number, input: InputKeluarga) => {
  if (!ambilAnggota(anggotaId)) return gagal('Anggota tidak ditemukan.')
  const v = validasiKeluarga(input)
  if (v.galat) return v.galat
  const baris = db
    .insert(schema.anggotaKeluarga)
    .values({ ...v.data!, anggotaId, dibuatPada: Date.now(), diubahPada: Date.now() })
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

export const ubahKeluarga = aksiTerlindungi(async (id: number, input: InputKeluarga) => {
  const lama = db.select().from(schema.anggotaKeluarga).where(and(eq(schema.anggotaKeluarga.id, id), isNull(schema.anggotaKeluarga.dihapusPada))).get()
  if (!lama) return gagal('Anggota keluarga tidak ditemukan.')
  const v = validasiKeluarga(input)
  if (v.galat) return v.galat
  const statusBerubah = lama.status !== v.data!.status || lama.tanggalMeninggal !== v.data!.tanggalMeninggal
  const baris = db
    .update(schema.anggotaKeluarga)
    .set({ ...v.data!, diubahPada: Date.now(), ...(statusBerubah ? { ditandaiOlehTransaksiId: null } : {}) })
    .where(eq(schema.anggotaKeluarga.id, id))
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

export const hapusKeluarga = aksiTerlindungi(async (id: number) => {
  const baris = db
    .update(schema.anggotaKeluarga)
    .set({ dihapusPada: Date.now(), diubahPada: Date.now() })
    .where(and(eq(schema.anggotaKeluarga.id, id), isNull(schema.anggotaKeluarga.dihapusPada)))
    .returning()
    .get()
  if (!baris) return gagal('Anggota keluarga tidak ditemukan.')
  segarkan()
  return berhasil(baris)
})

/**
 * Jadikan tanggungan sebagai anggota sendiri (Spec 2 §C2), dalam satu transaksi SQLite:
 * anggota baru (asal = induk, bergabung = hari ini), baris keluarga ditandai pindah lalu
 * dihapus lunak. Tanggungan berstatus meninggal tidak bisa dipecah.
 */
export const pecahKeluarga = aksiTerlindungi(async (id: number) => {
  const k = db.select().from(schema.anggotaKeluarga).where(and(eq(schema.anggotaKeluarga.id, id), isNull(schema.anggotaKeluarga.dihapusPada))).get()
  if (!k) return gagal('Anggota keluarga tidak ditemukan.')
  if (k.status === 'meninggal') return gagal('Tanggungan yang sudah meninggal dunia tidak bisa dijadikan anggota sendiri.')
  const baru = sqlite.transaction(() => {
    const a = db
      .insert(schema.anggota)
      .values({ nama: k.nama, anggotaAsalId: k.anggotaId, tanggalBergabung: hariIni(), aktif: true, status: 'aktif', dibuatPada: Date.now() })
      .returning()
      .get()
    db.update(schema.anggotaKeluarga)
      .set({ pindahKeAnggotaId: a.id, dihapusPada: Date.now(), diubahPada: Date.now() })
      .where(eq(schema.anggotaKeluarga.id, id))
      .run()
    return a
  })()
  segarkan()
  return berhasil(baru)
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
