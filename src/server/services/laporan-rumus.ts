// Rumus laporan (docs/02 §6) sebagai fungsi murni yang menerima Db — supaya bisa diuji
// dengan SQLite in-memory. services/laporan.ts mengikatnya ke database sungguhan.
import { and, count, eq, gte, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm'
import type { Db } from '@/server/db'
import { jenis, transaksi, type Arah, type Metode } from '@/server/db/schema'
import type { Rentang } from '@/lib/tanggal'

export type PenyaringLaporan = { jenisId?: number; metode?: Metode; cari?: string }

export type RingkasanPeriode = {
  sisaAwal: number
  masuk: number
  keluar: number
  selisih: number
  sisaAkhir: number
  jumlahCatatan: number
}

export type RincianJenis = { jenisId: number; nama: string; total: number; jumlah: number; persen: number }

export type BulanGrafik = { bulan: string; masuk: number; keluar: number }

const belumDihapus = () => isNull(transaksi.dihapusPada)

function kondisiPenyaring(p?: PenyaringLaporan): SQL | undefined {
  if (!p) return undefined
  const cari = p.cari?.trim()
  return and(
    p.jenisId ? eq(transaksi.jenisId, p.jenisId) : undefined,
    p.metode ? eq(transaksi.metode, p.metode) : undefined,
    cari ? or(like(transaksi.keterangan, `%${cari}%`), like(transaksi.namaPihak, `%${cari}%`)) : undefined,
  )
}

const jumlahArah = (arah: Arah) =>
  sql<number>`coalesce(sum(case when ${transaksi.arah} = ${arah} then ${transaksi.jumlah} else 0 end), 0)`

/** Σ masuk dan Σ keluar untuk tanggal < awal, tanpa penyaring — posisi kas sebenarnya. */
export function totalSebelum(db: Db, awal: string): { masuk: number; keluar: number } {
  const r = db
    .select({ masuk: jumlahArah('masuk'), keluar: jumlahArah('keluar') })
    .from(transaksi)
    .where(and(belumDihapus(), sql`${transaksi.tanggal} < ${awal}`))
    .get()
  return { masuk: Number(r?.masuk ?? 0), keluar: Number(r?.keluar ?? 0) }
}

/** Σ masuk, Σ keluar, dan jumlah catatan dalam rentang (inklusif kedua ujung). */
export function totalDalamRentang(db: Db, rentang: Rentang, penyaring?: PenyaringLaporan) {
  const r = db
    .select({ masuk: jumlahArah('masuk'), keluar: jumlahArah('keluar'), n: count() })
    .from(transaksi)
    .where(and(belumDihapus(), gte(transaksi.tanggal, rentang.awal), lte(transaksi.tanggal, rentang.akhir), kondisiPenyaring(penyaring)))
    .get()
  return { masuk: Number(r?.masuk ?? 0), keluar: Number(r?.keluar ?? 0), jumlah: r?.n ?? 0 }
}

/**
 * Ringkasan (docs/02 §6.2). Sisa Kas Awal/Akhir SENGAJA mengabaikan penyaring:
 * keduanya menggambarkan posisi uang sebenarnya, bukan irisan yang sedang dilihat.
 */
export function ringkasanPeriode(db: Db, saldoAwal: number, rentang: Rentang, penyaring?: PenyaringLaporan): RingkasanPeriode {
  const sebelum = totalSebelum(db, rentang.awal)
  const sisaAwal = saldoAwal + sebelum.masuk - sebelum.keluar
  const tersaring = totalDalamRentang(db, rentang, penyaring)
  const semua = penyaring && (penyaring.jenisId || penyaring.metode || penyaring.cari) ? totalDalamRentang(db, rentang) : tersaring
  return {
    sisaAwal,
    masuk: tersaring.masuk,
    keluar: tersaring.keluar,
    selisih: tersaring.masuk - tersaring.keluar,
    sisaAkhir: sisaAwal + semua.masuk - semua.keluar,
    jumlahCatatan: tersaring.jumlah,
  }
}

/** Rincian per jenis untuk satu arah: nominal, jumlah catatan, persen (0 bila total 0). */
export function rincianPerJenis(db: Db, rentang: Rentang, arah: Arah, penyaring?: PenyaringLaporan): RincianJenis[] {
  const baris = db
    .select({ jenisId: transaksi.jenisId, nama: jenis.nama, total: sql<number>`sum(${transaksi.jumlah})`, jumlah: count() })
    .from(transaksi)
    .innerJoin(jenis, eq(jenis.id, transaksi.jenisId))
    .where(and(belumDihapus(), eq(transaksi.arah, arah), gte(transaksi.tanggal, rentang.awal), lte(transaksi.tanggal, rentang.akhir), kondisiPenyaring(penyaring)))
    .groupBy(transaksi.jenisId, jenis.nama)
    .orderBy(sql`sum(${transaksi.jumlah}) desc`)
    .all()
  const totalArah = baris.reduce((a, b) => a + Number(b.total), 0)
  return baris.map((b) => ({
    jenisId: b.jenisId,
    nama: b.nama,
    total: Number(b.total),
    jumlah: b.jumlah,
    persen: totalArah === 0 ? 0 : Math.round((Number(b.total) / totalArah) * 1000) / 10,
  }))
}

/** Masuk vs keluar per bulan untuk satu tahun; bulan tanpa catatan tetap ada dengan 0. */
export function grafikBulanan(db: Db, tahun: number): BulanGrafik[] {
  const baris = db
    .select({ bulan: sql<string>`substr(${transaksi.tanggal}, 1, 7)`, masuk: jumlahArah('masuk'), keluar: jumlahArah('keluar') })
    .from(transaksi)
    .where(and(belumDihapus(), like(transaksi.tanggal, `${tahun}-%`)))
    .groupBy(sql`substr(${transaksi.tanggal}, 1, 7)`)
    .all()
  const peta = new Map(baris.map((b) => [b.bulan, b]))
  return Array.from({ length: 12 }, (_, i) => {
    const bulan = `${tahun}-${String(i + 1).padStart(2, '0')}`
    const b = peta.get(bulan)
    return { bulan, masuk: Number(b?.masuk ?? 0), keluar: Number(b?.keluar ?? 0) }
  })
}
