import 'server-only'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { jenis, transaksi, type Jenis } from '@/server/db/schema'

export type BarisJenis = Jenis & { dipakai: number }

/** Semua jenis (termasuk nonaktif) dengan jumlah catatan yang memakainya — untuk Pengaturan. */
export function semuaJenis(): BarisJenis[] {
  return db
    .select({
      id: jenis.id,
      kode: jenis.kode,
      nama: jenis.nama,
      arah: jenis.arah,
      keterangan: jenis.keterangan,
      urutan: jenis.urutan,
      aktif: jenis.aktif,
      bawaan: jenis.bawaan,
      menandaiMeninggal: jenis.menandaiMeninggal,
      nominalBawaan: jenis.nominalBawaan,
      nominalDikunci: jenis.nominalDikunci,
      periode: jenis.periode,
      biayaKutipPersen: jenis.biayaKutipPersen,
      biayaKutipJenisId: jenis.biayaKutipJenisId,
      dipakai: sql<number>`count(${transaksi.id})`,
    })
    .from(jenis)
    .leftJoin(transaksi, eq(transaksi.jenisId, jenis.id))
    .groupBy(jenis.id)
    .orderBy(asc(jenis.arah), asc(jenis.urutan))
    .all()
    .map((b) => ({ ...b, dipakai: Number(b.dipakai) }))
}
