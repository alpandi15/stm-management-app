import 'server-only'
import { and, asc, count, eq, inArray, isNotNull, isNull, like, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, anggotaKeluarga, jenis, rt, transaksi, type Anggota, type AnggotaKeluarga } from '@/server/db/schema'
import { dariCatatan, type BarisCatatan } from './transaksi'
import { tunggakanSemuaAnggota } from './duka'
import type { TunggakanDuka } from '@/lib/duka'

export type BarisAnggota = Anggota & { totalIuran: number; jumlahCatatan: number; jumlahKeluarga: number; namaAsal: string | null; tunggakanDuka: TunggakanDuka | null; namaRt: string | null }

import { PER_HALAMAN_ANGGOTA, type SaringAnggota } from '@/lib/anggota'

export type FilterAnggota = { cari?: string; saring?: SaringAnggota; rtId?: number | 'tanpa' }

function idNunggakDuka(): number[] {
  return [...tunggakanSemuaAnggota().entries()].filter(([, t]) => t.jumlahNunggak > 0).map(([id]) => id)
}

function kondisiAnggota(f: FilterAnggota): SQL | undefined {
  const cari = f.cari?.trim()
  const pola = cari ? `%${cari}%` : null
  return and(
    f.saring === 'nunggak-duka' ? (() => { const ids = idNunggakDuka(); return ids.length ? inArray(anggota.id, ids) : sql`0` })() : undefined,
    pola ? or(like(anggota.nama, pola), like(anggota.nomor, pola), like(anggota.alamat, pola), like(anggota.noHp, pola)) : undefined,
    f.saring === 'aktif' ? eq(anggota.aktif, true) : undefined,
    f.saring === 'nonaktif' ? eq(anggota.aktif, false) : undefined,
    f.saring === 'meninggal' ? eq(anggota.status, 'meninggal') : undefined,
    f.saring === 'pengutip' ? eq(anggota.pengutip, true) : undefined,
    f.rtId === 'tanpa' ? isNull(anggota.rtId) : f.rtId ? eq(anggota.rtId, f.rtId) : undefined,
  )
}

/** Jumlah anggota per keadaan — untuk tombol penyaring. */
export function ringkasanAnggota(): { semua: number; aktif: number; nonaktif: number; meninggal: number; pengutip: number; nunggakDuka: number } {
  const r = db
    .select({
      semua: count(),
      aktif: sql<number>`sum(case when ${anggota.aktif} = 1 then 1 else 0 end)`,
      nonaktif: sql<number>`sum(case when ${anggota.aktif} = 0 then 1 else 0 end)`,
      meninggal: sql<number>`sum(case when ${anggota.status} = 'meninggal' then 1 else 0 end)`,
      pengutip: sql<number>`sum(case when ${anggota.pengutip} = 1 then 1 else 0 end)`,
    })
    .from(anggota)
    .get()
  return { semua: r?.semua ?? 0, aktif: Number(r?.aktif ?? 0), nonaktif: Number(r?.nonaktif ?? 0), meninggal: Number(r?.meninggal ?? 0), pengutip: Number(r?.pengutip ?? 0), nunggakDuka: idNunggakDuka().length }
}

/**
 * Daftar anggota berhalaman (25 per halaman) dengan pencarian di server — siap untuk ribuan
 * anggota. Urutan: aktif dulu, lalu nama. Total iuran = Σ uang masuk atas namanya.
 */
export function daftarAnggota(f: FilterAnggota = {}, halaman = 1): { baris: BarisAnggota[]; total: number } {
  const where = kondisiAnggota(f)
  const total = db.select({ n: count() }).from(anggota).where(where).get()?.n ?? 0
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
  const tunggakan = tunggakanSemuaAnggota()
  const baris = db
    .select({
      id: anggota.id,
      nomor: anggota.nomor,
      nama: anggota.nama,
      jenisKelamin: anggota.jenisKelamin,
      noHp: anggota.noHp,
      alamat: anggota.alamat,
      rtId: anggota.rtId,
      namaRt: rt.nama,
      lat: anggota.lat,
      lng: anggota.lng,
      aktif: anggota.aktif,
      pengutip: anggota.pengutip,
      status: anggota.status,
      tanggalMeninggal: anggota.tanggalMeninggal,
      ditandaiOlehTransaksiId: anggota.ditandaiOlehTransaksiId,
      anggotaAsalId: anggota.anggotaAsalId,
      tanggalBergabung: anggota.tanggalBergabung,
      tanggalNonaktif: anggota.tanggalNonaktif,
      dibuatPada: anggota.dibuatPada,
      totalIuran: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      jumlahCatatan: sql<number>`count(${transaksi.id})`,
    })
    .from(anggota)
    .leftJoin(transaksi, and(eq(transaksi.anggotaId, anggota.id), isNull(transaksi.dihapusPada)))
    .leftJoin(rt, eq(rt.id, anggota.rtId))
    .where(where)
    .groupBy(anggota.id)
    .orderBy(sql`${anggota.aktif} desc`, asc(anggota.nama))
    .limit(PER_HALAMAN_ANGGOTA)
    .offset((halaman - 1) * PER_HALAMAN_ANGGOTA)
    .all()
    .map((b) => ({
      ...b,
      totalIuran: Number(b.totalIuran),
      jumlahCatatan: Number(b.jumlahCatatan),
      jumlahKeluarga: jumlahKeluarga.get(b.id) ?? 0,
      namaAsal: b.anggotaAsalId ? (namaSemua.get(b.anggotaAsalId) ?? null) : null,
      tunggakanDuka: tunggakan.get(b.id) ?? null,
    }))
  return { baris, total }
}

export type TitikAnggota = { id: number; nomor: string | null; nama: string; alamat: string | null; noHp: string | null; lat: number; lng: number; aktif: boolean; status: 'aktif' | 'meninggal' }

/** Semua anggota yang punya titik peta — untuk halaman peta (ribuan titik masih ringan). */
export function semuaTitikAnggota(): TitikAnggota[] {
  return db
    .select({ id: anggota.id, nomor: anggota.nomor, nama: anggota.nama, alamat: anggota.alamat, noHp: anggota.noHp, lat: anggota.lat, lng: anggota.lng, aktif: anggota.aktif, status: anggota.status })
    .from(anggota)
    .where(and(isNotNull(anggota.lat), isNotNull(anggota.lng)))
    .orderBy(asc(anggota.nama))
    .all()
    .map((a) => ({ ...a, lat: a.lat as number, lng: a.lng as number }))
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

/** Anggota dan tanggungan berstatus meninggal — untuk keterangan Iuran Duka. */
export function daftarAlmarhum(): Array<{ label: string; nama: string }> {
  const a = db
    .select({ nama: anggota.nama, tanggal: anggota.tanggalMeninggal })
    .from(anggota)
    .where(eq(anggota.status, 'meninggal'))
    .all()
    .map((x) => ({ nama: x.nama, label: `${x.nama} · anggota${x.tanggal ? ` · ${x.tanggal}` : ''}` }))
  const k = db
    .select({ nama: anggotaKeluarga.nama, hubungan: anggotaKeluarga.hubungan, induk: anggota.nama, tanggal: anggotaKeluarga.tanggalMeninggal })
    .from(anggotaKeluarga)
    .innerJoin(anggota, eq(anggota.id, anggotaKeluarga.anggotaId))
    .where(and(eq(anggotaKeluarga.status, 'meninggal'), isNull(anggotaKeluarga.dihapusPada)))
    .all()
    .map((x) => ({ nama: x.nama, label: `${x.nama} · ${x.hubungan} dari ${x.induk}${x.tanggal ? ` · ${x.tanggal}` : ''}` }))
  return [...a, ...k].sort((x, y) => x.nama.localeCompare(y.nama))
}

export const PER_HALAMAN_RIWAYAT_ANGGOTA = 25

/** Riwayat pembayaran seorang anggota: semua catatan atas namanya, terbaru dulu. */
export function riwayatAnggota(anggotaId: number, halaman = 1): { baris: BarisCatatan[]; total: number; totalMasuk: number; totalKeluar: number } {
  const where = and(eq(transaksi.anggotaId, anggotaId), isNull(transaksi.dihapusPada))
  const r = db
    .select({
      n: count(),
      masuk: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'masuk' then ${transaksi.jumlah} else 0 end), 0)`,
      keluar: sql<number>`coalesce(sum(case when ${transaksi.arah} = 'keluar' then ${transaksi.jumlah} else 0 end), 0)`,
    })
    .from(transaksi)
    .where(where)
    .get()
  const baris = dariCatatan()
    .where(where)
    .orderBy(sql`${transaksi.tanggal} desc`, sql`${transaksi.id} desc`)
    .limit(PER_HALAMAN_RIWAYAT_ANGGOTA)
    .offset((halaman - 1) * PER_HALAMAN_RIWAYAT_ANGGOTA)
    .all()
  return { baris, total: r?.n ?? 0, totalMasuk: Number(r?.masuk ?? 0), totalKeluar: Number(r?.keluar ?? 0) }
}

export type MatriksJenis = {
  jenisId: number
  nama: string
  periode: 'bulanan' | 'tahunan'
  tahun: number[]
  /** periode ('2026-10' / '2026') → nomor bukti */
  sudah: Record<string, string>
}

/**
 * Matriks "sudah bayar / belum" per jenis berperiode (bulanan → 12 kotak per tahun, tahunan → per
 * tahun). Tahun yang ditampilkan: dari tahun bergabung / catatan pertama sampai tahun ini.
 */
export function matriksPeriode(a: Anggota, tanggalMulaiPembukuan: string): MatriksJenis[] {
  const tahunIni = new Date().getFullYear()
  // Tidak lebih awal dari tanggal mulai pembukuan: sebelum itu tidak ada iuran yang dicatat aplikasi
  const tahunMinimal = Number(tanggalMulaiPembukuan.slice(0, 4)) || tahunIni
  const jenisBerperiode = db
    .select({ id: jenis.id, nama: jenis.nama, periode: jenis.periode })
    .from(jenis)
    .where(and(eq(jenis.aktif, true), or(eq(jenis.periode, 'bulanan'), eq(jenis.periode, 'tahunan'))))
    .orderBy(asc(jenis.urutan))
    .all()
  const bayar = db
    .select({ jenisId: transaksi.jenisId, periode: transaksi.periode, noBukti: transaksi.noBukti })
    .from(transaksi)
    .where(and(eq(transaksi.anggotaId, a.id), isNull(transaksi.dihapusPada), isNotNull(transaksi.periode)))
    .all()
  const tahunBergabung = Number((a.tanggalBergabung ?? '').slice(0, 4)) || new Date(a.dibuatPada).getFullYear()
  const tahunAwalDasar = Math.max(tahunMinimal, Math.min(tahunIni, tahunBergabung))
  return jenisBerperiode.map((j) => {
    const milik = bayar.filter((b) => b.jenisId === j.id)
    const tahunPertama = Math.max(tahunMinimal, Math.min(tahunAwalDasar, ...milik.map((b) => Number((b.periode ?? '').slice(0, 4)) || tahunIni)))
    const tahun = Array.from({ length: Math.max(1, tahunIni - tahunPertama + 1) }, (_, i) => tahunPertama + i)
    return {
      jenisId: j.id,
      nama: j.nama,
      periode: j.periode as 'bulanan' | 'tahunan',
      tahun,
      sudah: Object.fromEntries(milik.filter((b) => b.periode).map((b) => [b.periode as string, b.noBukti])),
    }
  })
}
