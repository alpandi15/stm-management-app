import 'server-only'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, transaksi, type Anggota } from '@/server/db/schema'

export type BarisAnggota = Anggota & { totalIuran: number; jumlahCatatan: number }

/** Daftar anggota (aktif dulu, lalu nama) dengan total uang masuk yang pernah tercatat atas namanya. */
export function daftarAnggota(): BarisAnggota[] {
  return db
    .select({
      id: anggota.id,
      nama: anggota.nama,
      noHp: anggota.noHp,
      alamat: anggota.alamat,
      aktif: anggota.aktif,
      dibuatPada: anggota.dibuatPada,
      totalIuran: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      jumlahCatatan: sql<number>`count(${transaksi.id})`,
    })
    .from(anggota)
    .leftJoin(transaksi, and(eq(transaksi.anggotaId, anggota.id), isNull(transaksi.dihapusPada)))
    .groupBy(anggota.id)
    .orderBy(sql`${anggota.aktif} desc`, asc(anggota.nama))
    .all()
    .map((b) => ({ ...b, totalIuran: Number(b.totalIuran), jumlahCatatan: Number(b.jumlahCatatan) }))
}
