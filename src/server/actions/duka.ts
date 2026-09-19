'use server'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, schema, sqlite } from '@/server/db'
import { aksiTerlindungi } from '@/server/auth/session'
import { nomorKejadianBerikutnya, daftarAnggotaKejadian, ringkasanDukaAnggota } from '@/server/queries/duka'
import { skemaKejadian, JUMLAH_MAKS, type InputKejadian } from '@/lib/validasi'
import { hariIni } from '@/lib/tanggal'
import { berhasil, gagal } from '@/lib/hasil'


function segarkan(id?: number) {
  revalidatePath('/duka')
  if (id) revalidatePath(`/duka/${id}`)
  revalidatePath('/anggota')
}

function validasi(input: InputKejadian) {
  const hasil = skemaKejadian.safeParse(input)
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { galat: gagal(isu?.message ?? 'Isian belum lengkap.', isu?.path[0]?.toString()) }
  }
  const d = hasil.data
  if (d.anggotaId && !db.select({ id: schema.anggota.id }).from(schema.anggota).where(eq(schema.anggota.id, d.anggotaId)).get()) {
    return { galat: gagal('Anggota yang dipilih tidak dikenali. Pilih ulang dari daftar.', 'anggotaId') }
  }
  return {
    data: {
      namaAlmarhum: d.namaAlmarhum,
      hubungan: d.hubungan?.trim() || null,
      anggotaId: d.anggotaId ?? null,
      anggotaKeluargaId: d.anggotaKeluargaId ?? null,
      tanggalMeninggal: d.tanggalMeninggal,
      tarif: d.tarif,
      keterangan: d.keterangan?.trim() || null,
    },
  }
}

export const tambahKejadian = aksiTerlindungi(async (input: InputKejadian) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const baris = db
    .insert(schema.kejadianDuka)
    .values({ ...v.data!, nomor: nomorKejadianBerikutnya(), dibuatPada: Date.now(), diubahPada: Date.now() })
    .returning()
    .get()
  segarkan()
  return berhasil(baris)
})

export const ubahKejadian = aksiTerlindungi(async (id: number, input: InputKejadian) => {
  const v = validasi(input)
  if (v.galat) return v.galat
  const baris = db.update(schema.kejadianDuka).set({ ...v.data!, diubahPada: Date.now() }).where(eq(schema.kejadianDuka.id, id)).returning().get()
  if (!baris) return gagal('Kejadian tidak ditemukan.')
  segarkan(id)
  return berhasil(baris)
})

/** Menghapus kejadian ikut menghapus semua centang pembayarannya (cascade). */
export const hapusKejadian = aksiTerlindungi(async (id: number) => {
  const baris = db.delete(schema.kejadianDuka).where(eq(schema.kejadianDuka.id, id)).returning().get()
  if (!baris) return gagal('Kejadian tidak ditemukan.')
  segarkan()
  return berhasil(baris)
})

/** Centang / hapus centang satu anggota. Idempoten. */
export const aturPembayaranDuka = aksiTerlindungi(async (kejadianId: number, anggotaId: number, sudahBayar: boolean, tanggalBayar?: string) => {
  const k = db.select({ id: schema.kejadianDuka.id }).from(schema.kejadianDuka).where(eq(schema.kejadianDuka.id, kejadianId)).get()
  if (!k) return gagal('Kejadian tidak ditemukan.')
  if (sudahBayar) {
    db.insert(schema.pembayaranDuka)
      .values({ kejadianId, anggotaId, tanggalBayar: tanggalBayar ?? hariIni(), dibuatPada: Date.now() })
      .onConflictDoNothing()
      .run()
  } else {
    db.delete(schema.pembayaranDuka).where(and(eq(schema.pembayaranDuka.kejadianId, kejadianId), eq(schema.pembayaranDuka.anggotaId, anggotaId))).run()
  }
  segarkan(kejadianId)
  return berhasil({ kejadianId, anggotaId, sudahBayar })
})

/** Centang banyak anggota sekaligus (mis. "tandai semua yang wajib"). Hanya yang wajib yang dicentang. */
export const tandaiBanyakDuka = aksiTerlindungi(async (kejadianId: number, anggotaIds: number[], sudahBayar: boolean) => {
  const wajib = new Set(daftarAnggotaKejadian(kejadianId).filter((a) => a.wajib).map((a) => a.id))
  if (wajib.size === 0 && anggotaIds.length > 0) return gagal('Kejadian tidak ditemukan atau tidak ada anggota yang wajib.')
  const ids = anggotaIds.filter((id) => wajib.has(id))
  let n = 0
  sqlite.transaction(() => {
    if (sudahBayar) {
      for (const anggotaId of ids) {
        const r = db.insert(schema.pembayaranDuka).values({ kejadianId, anggotaId, tanggalBayar: hariIni(), dibuatPada: Date.now() }).onConflictDoNothing().run()
        n += r.changes
      }
    } else if (ids.length > 0) {
      n = db.delete(schema.pembayaranDuka).where(and(eq(schema.pembayaranDuka.kejadianId, kejadianId), inArray(schema.pembayaranDuka.anggotaId, ids))).run().changes
    }
  })()
  segarkan(kejadianId)
  return berhasil({ jumlah: n })
})

/** Tunggakan lama seorang anggota (almarhumnya tidak tercatat): berapa kejadian, total rupiah, catatan. */
export const aturTunggakanLama = aksiTerlindungi(async (anggotaId: number, input: { jumlah: number; rupiah: number; keterangan?: string | null }) => {
  const jumlah = Number(input.jumlah)
  const rupiah = Number(input.rupiah)
  if (!Number.isInteger(jumlah) || jumlah < 0 || jumlah > 1000) return gagal('Jumlah kejadian harus angka bulat 0–1000.', 'jumlah')
  if (!Number.isInteger(rupiah) || rupiah < 0 || rupiah > JUMLAH_MAKS) return gagal('Total rupiah harus bilangan bulat tanpa koma.', 'rupiah')
  if (jumlah === 0 && rupiah > 0) return gagal('Isi berapa kejadian yang belum dibayar.', 'jumlah')
  if (jumlah > 0 && rupiah === 0) return gagal('Isi total rupiah tunggakannya.', 'rupiah')
  const keterangan = (input.keterangan ?? '').trim().slice(0, 255) || null
  const baris = db
    .update(schema.anggota)
    .set({ dukaLamaJumlah: jumlah, dukaLamaRupiah: rupiah, dukaLamaKeterangan: jumlah === 0 ? null : keterangan })
    .where(eq(schema.anggota.id, anggotaId))
    .returning()
    .get()
  if (!baris) return gagal('Anggota tidak ditemukan.')
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${anggotaId}`)
  return berhasil({ jumlah, rupiah, keterangan: baris.dukaLamaKeterangan })
})

/** Centang semua kejadian wajib yang belum dibayar untuk satu anggota (dari detail anggota). */
export const tandaiSemuaDukaAnggota = aksiTerlindungi(async (anggotaId: number) => {
  const r = ringkasanDukaAnggota(anggotaId)
  if (!r) return gagal('Anggota tidak ditemukan.')
  const belum = r.daftar.filter((k) => !k.sudahBayar)
  let n = 0
  sqlite.transaction(() => {
    for (const k of belum) {
      n += db.insert(schema.pembayaranDuka).values({ kejadianId: k.id, anggotaId, tanggalBayar: hariIni(), dibuatPada: Date.now() }).onConflictDoNothing().run().changes
    }
  })()
  revalidatePath('/duka')
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${anggotaId}`)
  return berhasil({ jumlah: n })
})
