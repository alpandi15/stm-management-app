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

// ---------- Tunggakan lama (sebelum Buku Duka dipakai) ----------

export type BarisTunggakanLamaInput = { jumlah: number; tarif: number; keterangan?: string | null }

function periksaBarisLama(b: BarisTunggakanLamaInput): { galat?: string; field?: string; data?: { jumlah: number; tarif: number; keterangan: string | null } } {
  const jumlah = Number(b.jumlah)
  const tarif = Number(b.tarif)
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 1000) return { galat: 'Berapa kejadian harus angka bulat 1–1000.', field: 'jumlah' }
  if (!Number.isInteger(tarif) || tarif < 1 || tarif > JUMLAH_MAKS) return { galat: 'Iuran per kejadian harus lebih dari nol, tanpa koma.', field: 'tarif' }
  return { data: { jumlah, tarif, keterangan: (b.keterangan ?? '').trim().slice(0, 255) || null } }
}

/** Menambah satu atau beberapa baris tunggakan lama sekaligus ("6 × 5.000" dan "10 × 7.000"). */
export const tambahTunggakanLama = aksiTerlindungi(async (anggotaId: number, baris: BarisTunggakanLamaInput[]) => {
  if (!db.select({ id: schema.anggota.id }).from(schema.anggota).where(eq(schema.anggota.id, anggotaId)).get()) return gagal('Anggota tidak ditemukan.')
  if (baris.length === 0) return gagal('Isi minimal satu baris tunggakan.')
  const bersih: Array<{ jumlah: number; tarif: number; keterangan: string | null }> = []
  for (const [i, b] of baris.entries()) {
    const v = periksaBarisLama(b)
    if (v.galat) return gagal(`Baris ${i + 1}: ${v.galat}`, `${v.field}-${i}`)
    bersih.push(v.data!)
  }
  sqlite.transaction(() => {
    for (const b of bersih) db.insert(schema.tunggakanDukaLama).values({ ...b, anggotaId, dibuatPada: Date.now(), diubahPada: Date.now() }).run()
  })()
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${anggotaId}`)
  return berhasil({ jumlah: bersih.length })
})

export const ubahTunggakanLama = aksiTerlindungi(async (id: number, baris: BarisTunggakanLamaInput) => {
  const v = periksaBarisLama(baris)
  if (v.galat) return gagal(v.galat, v.field)
  const hasil = db.update(schema.tunggakanDukaLama).set({ ...v.data!, diubahPada: Date.now() }).where(eq(schema.tunggakanDukaLama.id, id)).returning().get()
  if (!hasil) return gagal('Baris tunggakan tidak ditemukan.')
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${hasil.anggotaId}`)
  return berhasil(hasil)
})

/** Membayar n kejadian dari satu baris: jumlah berkurang; baris hilang bila lunas. */
export const bayarTunggakanLama = aksiTerlindungi(async (id: number, jumlahBayar: number) => {
  const b = db.select().from(schema.tunggakanDukaLama).where(eq(schema.tunggakanDukaLama.id, id)).get()
  if (!b) return gagal('Baris tunggakan tidak ditemukan.')
  const n = Number(jumlahBayar)
  if (!Number.isInteger(n) || n < 1) return gagal('Isi berapa kejadian yang dibayar.', 'jumlahBayar')
  if (n > b.jumlah) return gagal(`Tunggakan di baris ini hanya ${b.jumlah} kejadian.`, 'jumlahBayar')
  const sisa = b.jumlah - n
  if (sisa === 0) db.delete(schema.tunggakanDukaLama).where(eq(schema.tunggakanDukaLama.id, id)).run()
  else db.update(schema.tunggakanDukaLama).set({ jumlah: sisa, diubahPada: Date.now() }).where(eq(schema.tunggakanDukaLama.id, id)).run()
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${b.anggotaId}`)
  return berhasil({ sisa, dibayar: n, rupiah: n * b.tarif })
})

export const hapusTunggakanLama = aksiTerlindungi(async (id: number) => {
  const b = db.delete(schema.tunggakanDukaLama).where(eq(schema.tunggakanDukaLama.id, id)).returning().get()
  if (!b) return gagal('Baris tunggakan tidak ditemukan.')
  revalidatePath('/anggota')
  revalidatePath(`/anggota/${b.anggotaId}`)
  return berhasil(b)
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
