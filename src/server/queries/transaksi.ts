import 'server-only'
import { and, asc, count, desc, eq, gte, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, jenis, transaksi, type Arah, type Jenis, type Transaksi } from '@/server/db/schema'
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
}

/** Baris catatan lengkap dengan nama jenis, siap tampil di kartu. */
export type BarisCatatan = Transaksi & { namaJenis: string }

const kolomBaris = {
  id: transaksi.id,
  noBukti: transaksi.noBukti,
  tanggal: transaksi.tanggal,
  arah: transaksi.arah,
  jenisId: transaksi.jenisId,
  anggotaId: transaksi.anggotaId,
  namaPihak: transaksi.namaPihak,
  keterangan: transaksi.keterangan,
  metode: transaksi.metode,
  jumlah: transaksi.jumlah,
  buktiFile: transaksi.buktiFile,
  dihapusPada: transaksi.dihapusPada,
  dibuatPada: transaksi.dibuatPada,
  diubahPada: transaksi.diubahPada,
  namaJenis: jenis.nama,
}

function kondisi(f: FilterCatatan): SQL | undefined {
  const cari = f.cari?.trim()
  return and(
    belumDihapus(),
    gte(transaksi.tanggal, f.rentang.awal),
    lte(transaksi.tanggal, f.rentang.akhir),
    f.arah ? eq(transaksi.arah, f.arah) : undefined,
    f.jenisId ? eq(transaksi.jenisId, f.jenisId) : undefined,
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

/** Daftar catatan sesuai penyaring, terbaru dulu, dengan halaman. */
export function daftarCatatan(f: FilterCatatan, halaman = 1): { baris: BarisCatatan[]; total: number } {
  const where = kondisi(f)
  const total = db.select({ n: count() }).from(transaksi).where(where).get()?.n ?? 0
  const baris = db
    .select(kolomBaris)
    .from(transaksi)
    .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
    .where(where)
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id))
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
  return (
    db
      .select(kolomBaris)
      .from(transaksi)
      .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
      .where(and(eq(transaksi.id, id), belumDihapus()))
      .get() ?? null
  )
}

/** Lima catatan terakhir untuk Beranda. */
export function catatanTerakhir(n = 5): BarisCatatan[] {
  return db
    .select(kolomBaris)
    .from(transaksi)
    .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
    .where(belumDihapus())
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id))
    .limit(n)
    .all()
}

/** Jenis aktif untuk pilihan di form dan penyaring, urut sesuai `urutan`. */
export function daftarJenisAktif(): Jenis[] {
  return db.select().from(jenis).where(eq(jenis.aktif, true)).orderBy(asc(jenis.urutan), asc(jenis.nama)).all()
}

/** Anggota aktif untuk pilihan "Dari / Untuk siapa". */
export function daftarAnggotaAktif(): Array<{ id: number; nama: string }> {
  return db
    .select({ id: anggota.id, nama: anggota.nama })
    .from(anggota)
    .where(eq(anggota.aktif, true))
    .orderBy(asc(anggota.nama))
    .all()
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

