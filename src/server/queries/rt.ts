import 'server-only'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, rt, type Rt } from '@/server/db/schema'

export type BarisRt = Rt & { jumlahAnggota: number; jumlahAktif: number }

/** Semua RT, urut `urutan` lalu nama, dengan jumlah anggota. */
export function daftarRt(): BarisRt[] {
  const hitung = new Map(
    db
      .select({ rtId: anggota.rtId, n: sql<number>`count(*)`, aktif: sql<number>`sum(case when ${anggota.aktif} = 1 then 1 else 0 end)` })
      .from(anggota)
      .groupBy(anggota.rtId)
      .all()
      .map((r) => [r.rtId, { n: Number(r.n), aktif: Number(r.aktif) }]),
  )
  return db
    .select()
    .from(rt)
    .orderBy(asc(rt.urutan), asc(rt.nama))
    .all()
    .map((r) => ({ ...r, jumlahAnggota: hitung.get(r.id)?.n ?? 0, jumlahAktif: hitung.get(r.id)?.aktif ?? 0 }))
}

export function ambilRt(id: number): Rt | null {
  return db.select().from(rt).where(eq(rt.id, id)).get() ?? null
}

/** Jumlah anggota tanpa RT — untuk pengingat di halaman RT. */
export function jumlahTanpaRt(): number {
  return db.select({ n: sql<number>`count(*)` }).from(anggota).where(sql`${anggota.rtId} is null`).get()?.n ?? 0
}
