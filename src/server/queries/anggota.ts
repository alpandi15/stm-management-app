import 'server-only'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, anggotaKeluarga, transaksi, type Anggota, type AnggotaKeluarga } from '@/server/db/schema'

export type BarisAnggota = Anggota & { totalIuran: number; jumlahCatatan: number; jumlahKeluarga: number; namaAsal: string | null }

/** Daftar anggota (aktif dulu, lalu nama) dengan total uang masuk yang pernah tercatat atas namanya. */
export function daftarAnggota(): BarisAnggota[] {
  const jumlahKeluarga = new Map(
    db
      .select({ anggotaId: anggotaKeluarga.anggotaId, n: sql<number>`count(*)` })
      .from(anggotaKeluarga)
      .where(isNull(anggotaKeluarga.dihapusPada))
      .groupBy(anggotaKeluarga.anggotaId)
      .all()
      .map((r) => [r.anggotaId, Number(r.n)]),
  )
  const namaSemua = new Map(db.select({ id: anggota.id, nama: anggota.nama }).from(anggota).all().map((a) => [a.id, a.nama]))
  return db
    .select({
      id: anggota.id,
      nomor: anggota.nomor,
      nama: anggota.nama,
      noHp: anggota.noHp,
      alamat: anggota.alamat,
      lat: anggota.lat,
      lng: anggota.lng,
      aktif: anggota.aktif,
      status: anggota.status,
      tanggalMeninggal: anggota.tanggalMeninggal,
      ditandaiOlehTransaksiId: anggota.ditandaiOlehTransaksiId,
      anggotaAsalId: anggota.anggotaAsalId,
      tanggalBergabung: anggota.tanggalBergabung,
      dibuatPada: anggota.dibuatPada,
      totalIuran: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      jumlahCatatan: sql<number>`count(${transaksi.id})`,
    })
    .from(anggota)
    .leftJoin(transaksi, and(eq(transaksi.anggotaId, anggota.id), isNull(transaksi.dihapusPada)))
    .groupBy(anggota.id)
    .orderBy(sql`${anggota.aktif} desc`, asc(anggota.nama))
    .all()
    .map((b) => ({
      ...b,
      totalIuran: Number(b.totalIuran),
      jumlahCatatan: Number(b.jumlahCatatan),
      jumlahKeluarga: jumlahKeluarga.get(b.id) ?? 0,
      namaAsal: b.anggotaAsalId ? (namaSemua.get(b.anggotaAsalId) ?? null) : null,
    }))
}

export function ambilAnggota(id: number): Anggota | null {
  return db.select().from(anggota).where(eq(anggota.id, id)).get() ?? null
}

/** Nomor anggota berikutnya yang disarankan: A-0001, A-0002, … (boleh diubah pengguna). */
export function saranNomorAnggota(): string {
  const semua = db.select({ nomor: anggota.nomor }).from(anggota).all()
  let n = 0
  for (const a of semua) {
    const m = a.nomor?.match(/^A-(\d+)$/)
    if (m) n = Math.max(n, Number(m[1]))
  }
  return `A-${String(n + 1).padStart(4, '0')}`
}

export type BarisKeluarga = AnggotaKeluarga & { namaPindah: string | null }

/** Tanggungan aktif (belum dihapus) + yang sudah pecah jadi anggota sendiri (Spec 2 §C3). */
export function daftarKeluarga(anggotaId: number): { aktif: BarisKeluarga[]; pecah: BarisKeluarga[] } {
  const namaSemua = new Map(db.select({ id: anggota.id, nama: anggota.nama }).from(anggota).all().map((a) => [a.id, a.nama]))
  const semua = db
    .select()
    .from(anggotaKeluarga)
    .where(eq(anggotaKeluarga.anggotaId, anggotaId))
    .orderBy(asc(anggotaKeluarga.nama))
    .all()
    .map((k) => ({ ...k, namaPindah: k.pindahKeAnggotaId ? (namaSemua.get(k.pindahKeAnggotaId) ?? null) : null }))
  return {
    aktif: semua.filter((k) => !k.dihapusPada),
    pecah: semua.filter((k) => k.dihapusPada && k.pindahKeAnggotaId),
  }
}
