import 'server-only'
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { db } from '@/server/db'
import { anggota, jenis, setoran, transaksi, type Setoran } from '@/server/db/schema'
import { dariCatatan, type BarisCatatan } from './transaksi'

export const PER_HALAMAN_SETORAN = 25

export type BarisSetoran = Setoran & { namaJenis: string | null; namaPenyetor: string | null; jumlahCatatan: number; jumlahAnggota: number; total: number; jumlahJenis: number }

const penyetor = alias(anggota, 'penyetor')

/** Daftar setoran, terbaru dulu, dengan total dari catatan yang masih hidup. */
export function daftarSetoran(halaman = 1): { baris: BarisSetoran[]; total: number } {
  const where = isNull(setoran.dihapusPada)
  const total = db.select({ n: count() }).from(setoran).where(where).get()?.n ?? 0
  const baris = db
    .select({
      id: setoran.id,
      nomor: setoran.nomor,
      tanggal: setoran.tanggal,
      jenisId: setoran.jenisId,
      periode: setoran.periode,
      penyetorAnggotaId: setoran.penyetorAnggotaId,
      keterangan: setoran.keterangan,
      metode: setoran.metode,
      buktiFile: setoran.buktiFile,
      dihapusPada: setoran.dihapusPada,
      dibuatPada: setoran.dibuatPada,
      diubahPada: setoran.diubahPada,
      namaJenis: jenis.nama,
      namaPenyetor: penyetor.nama,
      jumlahCatatan: sql<number>`(select count(*) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      jumlahAnggota: sql<number>`(select count(distinct t.anggota_id) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      total: sql<number>`(select coalesce(sum(t.jumlah), 0) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      jumlahJenis: sql<number>`(select count(distinct t.jenis_id) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
    })
    .from(setoran)
    .leftJoin(jenis, eq(jenis.id, setoran.jenisId))
    .leftJoin(penyetor, eq(penyetor.id, setoran.penyetorAnggotaId))
    .where(where)
    .orderBy(desc(setoran.tanggal), desc(setoran.id))
    .limit(PER_HALAMAN_SETORAN)
    .offset((halaman - 1) * PER_HALAMAN_SETORAN)
    .all()
    .map((b) => ({ ...b, jumlahCatatan: Number(b.jumlahCatatan), jumlahAnggota: Number(b.jumlahAnggota), total: Number(b.total), jumlahJenis: Number(b.jumlahJenis) }))
  return { baris, total }
}

export function ambilSetoran(id: number): (BarisSetoran & { catatan: BarisCatatan[] }) | null {
  const kepala = daftarSetoranSatu(id)
  if (!kepala) return null
  const catatan = dariCatatan()
    .where(and(eq(transaksi.setoranId, id), isNull(transaksi.dihapusPada)))
    .orderBy(asc(transaksi.id))
    .all()
  return { ...kepala, catatan }
}

function daftarSetoranSatu(id: number): BarisSetoran | null {
  const b = db
    .select({
      id: setoran.id,
      nomor: setoran.nomor,
      tanggal: setoran.tanggal,
      jenisId: setoran.jenisId,
      periode: setoran.periode,
      penyetorAnggotaId: setoran.penyetorAnggotaId,
      keterangan: setoran.keterangan,
      metode: setoran.metode,
      buktiFile: setoran.buktiFile,
      dihapusPada: setoran.dihapusPada,
      dibuatPada: setoran.dibuatPada,
      diubahPada: setoran.diubahPada,
      namaJenis: jenis.nama,
      namaPenyetor: penyetor.nama,
      jumlahCatatan: sql<number>`(select count(*) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      jumlahAnggota: sql<number>`(select count(distinct t.anggota_id) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      total: sql<number>`(select coalesce(sum(t.jumlah), 0) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
      jumlahJenis: sql<number>`(select count(distinct t.jenis_id) from ${transaksi} t where t.setoran_id = ${setoran.id} and t.dihapus_pada is null)`,
    })
    .from(setoran)
    .leftJoin(jenis, eq(jenis.id, setoran.jenisId))
    .leftJoin(penyetor, eq(penyetor.id, setoran.penyetorAnggotaId))
    .where(and(eq(setoran.id, id), isNull(setoran.dihapusPada)))
    .get()
  return b ? { ...b, jumlahCatatan: Number(b.jumlahCatatan), jumlahAnggota: Number(b.jumlahAnggota), total: Number(b.total), jumlahJenis: Number(b.jumlahJenis) } : null
}

/** Rekap per jenis dalam satu setoran (untuk detail & tanda terima). */
export function rekapJenisSetoran(id: number): Array<{ jenisId: number; nama: string; jumlah: number; total: number }> {
  return db
    .select({ jenisId: transaksi.jenisId, nama: jenis.nama, jumlah: count(), total: sql<number>`sum(${transaksi.jumlah})` })
    .from(transaksi)
    .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
    .where(and(eq(transaksi.setoranId, id), isNull(transaksi.dihapusPada)))
    .groupBy(transaksi.jenisId, jenis.nama)
    .orderBy(sql`sum(${transaksi.jumlah}) desc`)
    .all()
    .map((r) => ({ ...r, total: Number(r.total) }))
}
