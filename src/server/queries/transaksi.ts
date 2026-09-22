import 'server-only'
import { URUT_BAWAAN, type UrutCatatan } from '@/lib/urut-catatan'
import { and, asc, count, desc, eq, gte, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/server/db'
import { anggota, anggotaKeluarga, jenis, setoran, transaksi, type Arah, type Jenis, type Transaksi } from '@/server/db/schema'
import type { Rentang } from '@/lib/tanggal'

/**
 * Helper dasar (docs/02 §5.4): SEMUA pembacaan catatan memakai ini supaya catatan terhapus
 * tidak pernah bocor ke daftar, ringkasan, atau laporan. Jangan menulis
 * isNull(transaksi.dihapusPada) di tempat lain.
 */
export const belumDihapus = () => isNull(transaksi.dihapusPada)

export type FilterCatatan = {
  rentang: Rentang
  arah?: Arah
  jenisId?: number
  cari?: string
  /** Penyetor: id anggota, atau 'bendahara' untuk catatan tanpa penyetor */
  penyetor?: number | 'bendahara'
}

/** Join kedua ke tabel anggota untuk penyetor. */
const penyetor = alias(anggota, 'penyetor')

/**
 * Baris catatan lengkap dengan nama jenis, siap tampil di kartu. Untuk jenis penanda
 * meninggal (Spec 2 §A5) ikut nama & hubungan yang meninggal: nama di kolom pihak adalah
 * PENERIMA uang, belum tentu yang meninggal.
 */
export type BarisCatatan = Transaksi & {
  namaJenis: string
  menandaiMeninggal: boolean
  /** Nama tanggungan yang meninggal; null = anggotanya sendiri (lihat namaAnggota) atau bukan penanda */
  namaMeninggal: string | null
  hubunganMeninggal: string | null
  namaAnggota: string | null
  /** Nama penyetor/penyerah; null = bendahara sendiri */
  namaPenyetor: string | null
  nomorSetoran: string | null
}

const kolomBaris = {
  id: transaksi.id,
  noBukti: transaksi.noBukti,
  tanggal: transaksi.tanggal,
  arah: transaksi.arah,
  jenisId: transaksi.jenisId,
  anggotaId: transaksi.anggotaId,
  anggotaKeluargaId: transaksi.anggotaKeluargaId,
  namaPihak: transaksi.namaPihak,
  keterangan: transaksi.keterangan,
  metode: transaksi.metode,
  jumlah: transaksi.jumlah,
  buktiFile: transaksi.buktiFile,
  dihapusPada: transaksi.dihapusPada,
  dibuatPada: transaksi.dibuatPada,
  diubahPada: transaksi.diubahPada,
  otomatis: transaksi.otomatis,
  indukId: transaksi.indukId,
  namaJenis: jenis.nama,
  menandaiMeninggal: jenis.menandaiMeninggal,
  namaMeninggal: anggotaKeluarga.nama,
  hubunganMeninggal: anggotaKeluarga.hubungan,
  namaAnggota: anggota.nama,
  penyetorAnggotaId: transaksi.penyetorAnggotaId,
  periode: transaksi.periode,
  setoranId: transaksi.setoranId,
  namaPenyetor: penyetor.nama,
  nomorSetoran: setoran.nomor,
}

/** Sumber baris standar: transaksi ⋈ jenis, ⟕ keluarga (yang meninggal), ⟕ anggota, ⟕ penyetor, ⟕ setoran. */
export function dariCatatan() {
  return db
    .select(kolomBaris)
    .from(transaksi)
    .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
    .leftJoin(anggotaKeluarga, eq(anggotaKeluarga.id, transaksi.anggotaKeluargaId))
    .leftJoin(anggota, eq(anggota.id, transaksi.anggotaId))
    .leftJoin(penyetor, eq(penyetor.id, transaksi.penyetorAnggotaId))
    .leftJoin(setoran, eq(setoran.id, transaksi.setoranId))
}



function kondisi(f: FilterCatatan): SQL | undefined {
  const cari = f.cari?.trim()
  return and(
    belumDihapus(),
    gte(transaksi.tanggal, f.rentang.awal),
    lte(transaksi.tanggal, f.rentang.akhir),
    f.arah ? eq(transaksi.arah, f.arah) : undefined,
    f.jenisId ? eq(transaksi.jenisId, f.jenisId) : undefined,
    f.penyetor === 'bendahara' ? isNull(transaksi.penyetorAnggotaId) : f.penyetor ? eq(transaksi.penyetorAnggotaId, f.penyetor) : undefined,
    cari
      ? or(
          like(transaksi.keterangan, `%${cari}%`),
          like(transaksi.namaPihak, `%${cari}%`),
          like(transaksi.noBukti, `%${cari}%`),
        )
      : undefined,
  )
}

export const PER_HALAMAN = 50

function urutan(u: UrutCatatan) {
  // id ikut diurutkan supaya dua catatan dengan tanggal/waktu sama tetap stabil urutannya
  switch (u) {
    case 'dibuat-asc':
      return [asc(transaksi.dibuatPada), asc(transaksi.id)]
    case 'tanggal-desc':
      return [desc(transaksi.tanggal), desc(transaksi.dibuatPada), desc(transaksi.id)]
    case 'tanggal-asc':
      return [asc(transaksi.tanggal), asc(transaksi.dibuatPada), asc(transaksi.id)]
    default:
      return [desc(transaksi.dibuatPada), desc(transaksi.id)]
  }
}

/** Daftar catatan sesuai penyaring, dengan halaman. Bawaan: yang terakhir dicatat di atas (docs/01 §5.4). */
export function daftarCatatan(f: FilterCatatan, halaman = 1, urut: UrutCatatan = URUT_BAWAAN): { baris: BarisCatatan[]; total: number } {
  const where = kondisi(f)
  const total = db.select({ n: count() }).from(transaksi).where(where).get()?.n ?? 0
  const baris = dariCatatan()
    .where(where)
    .orderBy(...urutan(urut))
    .limit(PER_HALAMAN)
    .offset((halaman - 1) * PER_HALAMAN)
    .all()
  return { baris, total }
}

/** Tiga angka ringkasan hasil penyaringan (docs/01 §5.4), dihitung di SQL — bukan dari halaman tampil. */
export function ringkasanCatatan(f: FilterCatatan): { masuk: number; keluar: number; selisih: number; jumlah: number } {
  const r = db
    .select({
      masuk: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      keluar: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'keluar' then ${transaksi.jumlah} else 0 end), 0)`,
      jumlah: count(),
    })
    .from(transaksi)
    .where(kondisi(f))
    .get()
  const masuk = Number(r?.masuk ?? 0)
  const keluar = Number(r?.keluar ?? 0)
  return { masuk, keluar, selisih: masuk - keluar, jumlah: r?.jumlah ?? 0 }
}

export function ambilCatatan(id: number): BarisCatatan | null {
  return dariCatatan().where(and(eq(transaksi.id, id), belumDihapus())).get() ?? null
}

/** Lima catatan terakhir untuk Beranda. */
export function catatanTerakhir(n = 5): BarisCatatan[] {
  return dariCatatan().where(belumDihapus()).orderBy(desc(transaksi.tanggal), desc(transaksi.id)).limit(n).all()
}

/** Jenis aktif untuk pilihan di form dan penyaring, urut sesuai `urutan`. */
export function daftarJenisAktif(): Jenis[] {
  return db.select().from(jenis).where(eq(jenis.aktif, true)).orderBy(asc(jenis.urutan), asc(jenis.nama)).all()
}

export type AnggotaUntukForm = {
  id: number
  nama: string
  nomor: string | null
  pengutip: boolean
  status: 'aktif' | 'meninggal'
  keluarga: Array<{ id: number; nama: string; hubungan: string; status: 'aktif' | 'meninggal' }>
}

/** Anggota aktif untuk pilihan "Dari / Untuk siapa", beserta tanggungannya (Spec 2 §A5). */
export function daftarAnggotaAktif(): AnggotaUntukForm[] {
  const daftar = db
    .select({ id: anggota.id, nama: anggota.nama, nomor: anggota.nomor, pengutip: anggota.pengutip, status: anggota.status })
    .from(anggota)
    .where(eq(anggota.aktif, true))
    .orderBy(asc(anggota.nama))
    .all()
  const keluarga = db
    .select({ id: anggotaKeluarga.id, anggotaId: anggotaKeluarga.anggotaId, nama: anggotaKeluarga.nama, hubungan: anggotaKeluarga.hubungan, status: anggotaKeluarga.status })
    .from(anggotaKeluarga)
    .where(isNull(anggotaKeluarga.dihapusPada))
    .orderBy(asc(anggotaKeluarga.nama))
    .all()
  return daftar.map((a) => ({
    ...a,
    keluarga: keluarga.filter((k) => k.anggotaId === a.id).map((k) => ({ id: k.id, nama: k.nama, hubungan: k.hubungan, status: k.status })),
  }))
}

/** Dipakai pemeriksaan kas & laporan: Σ per arah tanpa penyaring apa pun. */
export function totalSemua(): { masuk: number; keluar: number } {
  const r = db
    .select({
      masuk: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      keluar: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'keluar' then ${transaksi.jumlah} else 0 end), 0)`,
    })
    .from(transaksi)
    .where(belumDihapus())
    .get()
  return { masuk: Number(r?.masuk ?? 0), keluar: Number(r?.keluar ?? 0) }
}


/** Seluruh catatan dalam rentang, urut waktu dicatat naik — untuk Buku Kas dengan saldo berjalan (urutan buku manual). */
export function semuaCatatanDalamRentang(rentang: Rentang): BarisCatatan[] {
  return dariCatatan()
    .where(and(belumDihapus(), gte(transaksi.tanggal, rentang.awal), lte(transaksi.tanggal, rentang.akhir)))
    .orderBy(asc(transaksi.dibuatPada), asc(transaksi.id))
    .all()
}

/** Pilihan penyetor: anggota aktif, pengutip paling atas. */
export function daftarPenyetor(): Array<{ id: number; nama: string; nomor: string | null; pengutip: boolean }> {
  return db
    .select({ id: anggota.id, nama: anggota.nama, nomor: anggota.nomor, pengutip: anggota.pengutip })
    .from(anggota)
    .where(eq(anggota.aktif, true))
    .orderBy(sql`${anggota.pengutip} desc`, asc(anggota.nama))
    .all()
}
