import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/server/db'
import { anggota, anggotaKeluarga, kejadianDuka, pembayaranDuka, type KejadianDuka } from '@/server/db/schema'
import { hitungTunggakan, wajibBayarDuka, type AnggotaUntukDuka, type KejadianUntukDuka, type TunggakanDuka } from '@/lib/duka'

const kolomAnggotaDuka = {
  id: anggota.id,
  aktif: anggota.aktif,
  status: anggota.status,
  tanggalMeninggal: anggota.tanggalMeninggal,
  tanggalBergabung: anggota.tanggalBergabung,
  tanggalNonaktif: anggota.tanggalNonaktif,
}

function semuaAnggotaDuka(): AnggotaUntukDuka[] {
  return db.select(kolomAnggotaDuka).from(anggota).all()
}

export type BarisKejadian = KejadianDuka & { jumlahWajib: number; jumlahBayar: number; totalTerkumpul: number; totalNunggak: number }

/** Semua kejadian, terbaru di atas, dengan hitungan wajib/bayar menurut aturan lib/duka.ts. */
export function daftarKejadian(): BarisKejadian[] {
  const kejadian = db.select().from(kejadianDuka).orderBy(desc(kejadianDuka.tanggalMeninggal), desc(kejadianDuka.nomor)).all()
  if (kejadian.length === 0) return []
  const semua = semuaAnggotaDuka()
  const bayar = new Map<number, Set<number>>()
  for (const p of db.select({ kejadianId: pembayaranDuka.kejadianId, anggotaId: pembayaranDuka.anggotaId }).from(pembayaranDuka).all()) {
    if (!bayar.has(p.kejadianId)) bayar.set(p.kejadianId, new Set())
    bayar.get(p.kejadianId)!.add(p.anggotaId)
  }
  return kejadian.map((k) => {
    const sudah = bayar.get(k.id) ?? new Set<number>()
    let jumlahWajib = 0
    let jumlahBayar = 0
    for (const a of semua) {
      if (!wajibBayarDuka(a, k)) continue
      jumlahWajib += 1
      if (sudah.has(a.id)) jumlahBayar += 1
    }
    return { ...k, jumlahWajib, jumlahBayar, totalTerkumpul: jumlahBayar * k.tarif, totalNunggak: (jumlahWajib - jumlahBayar) * k.tarif }
  })
}

export function ambilKejadian(id: number): BarisKejadian | null {
  return daftarKejadian().find((k) => k.id === id) ?? null
}

/** Tarif yang berlaku sekarang = tarif kejadian terakhir (null bila belum ada kejadian). */
export function tarifBerlaku(): number | null {
  return db.select({ tarif: kejadianDuka.tarif }).from(kejadianDuka).orderBy(desc(kejadianDuka.tanggalMeninggal), desc(kejadianDuka.nomor)).get()?.tarif ?? null
}

export function nomorKejadianBerikutnya(): number {
  return (db.select({ n: sql<number>`coalesce(max(${kejadianDuka.nomor}), 0)` }).from(kejadianDuka).get()?.n ?? 0) + 1
}

export type BarisAnggotaKejadian = {
  id: number
  nomor: string | null
  nama: string
  alamat: string | null
  aktif: boolean
  status: 'aktif' | 'meninggal'
  wajib: boolean
  sudahBayar: boolean
  tanggalBayar: string | null
}

/** Daftar centang untuk satu kejadian: semua anggota, ditandai wajib/tidak dan sudah bayar/belum. */
export function daftarAnggotaKejadian(kejadianId: number): BarisAnggotaKejadian[] {
  const k = db.select().from(kejadianDuka).where(eq(kejadianDuka.id, kejadianId)).get()
  if (!k) return []
  const bayar = new Map(
    db
      .select({ anggotaId: pembayaranDuka.anggotaId, tanggalBayar: pembayaranDuka.tanggalBayar })
      .from(pembayaranDuka)
      .where(eq(pembayaranDuka.kejadianId, kejadianId))
      .all()
      .map((p) => [p.anggotaId, p.tanggalBayar]),
  )
  return db
    .select({ ...kolomAnggotaDuka, nomor: anggota.nomor, nama: anggota.nama, alamat: anggota.alamat })
    .from(anggota)
    .orderBy(asc(anggota.nama))
    .all()
    .map((a) => ({
      id: a.id,
      nomor: a.nomor,
      nama: a.nama,
      alamat: a.alamat,
      aktif: a.aktif,
      status: a.status,
      wajib: wajibBayarDuka(a, k),
      sudahBayar: bayar.has(a.id),
      tanggalBayar: bayar.get(a.id) ?? null,
    }))
}

export type RingkasanDukaAnggota = TunggakanDuka & {
  daftar: Array<KejadianDuka & { sudahBayar: boolean; tanggalBayar: string | null }>
}

/** Untuk detail anggota: kejadian yang menjadi kewajibannya beserta status bayar. */
export function ringkasanDukaAnggota(anggotaId: number): RingkasanDukaAnggota | null {
  const a = db.select(kolomAnggotaDuka).from(anggota).where(eq(anggota.id, anggotaId)).get()
  if (!a) return null
  const kejadian = db.select().from(kejadianDuka).orderBy(desc(kejadianDuka.tanggalMeninggal), desc(kejadianDuka.nomor)).all()
  const bayar = new Map(
    db
      .select({ kejadianId: pembayaranDuka.kejadianId, tanggalBayar: pembayaranDuka.tanggalBayar })
      .from(pembayaranDuka)
      .where(eq(pembayaranDuka.anggotaId, anggotaId))
      .all()
      .map((p) => [p.kejadianId, p.tanggalBayar]),
  )
  const wajib = kejadian.filter((k) => wajibBayarDuka(a, k))
  return {
    ...hitungTunggakan(a, kejadian, new Set(bayar.keys())),
    daftar: wajib.map((k) => ({ ...k, sudahBayar: bayar.has(k.id), tanggalBayar: bayar.get(k.id) ?? null })),
  }
}

/** Tunggakan semua anggota sekaligus (untuk badge & penyaring daftar anggota). */
export function tunggakanSemuaAnggota(): Map<number, TunggakanDuka> {
  const kejadian: KejadianUntukDuka[] = db.select().from(kejadianDuka).all()
  const hasil = new Map<number, TunggakanDuka>()
  if (kejadian.length === 0) return hasil
  const bayar = new Map<number, Set<number>>()
  for (const p of db.select({ kejadianId: pembayaranDuka.kejadianId, anggotaId: pembayaranDuka.anggotaId }).from(pembayaranDuka).all()) {
    if (!bayar.has(p.anggotaId)) bayar.set(p.anggotaId, new Set())
    bayar.get(p.anggotaId)!.add(p.kejadianId)
  }
  for (const a of semuaAnggotaDuka()) hasil.set(a.id, hitungTunggakan(a, kejadian, bayar.get(a.id) ?? new Set()))
  return hasil
}

/** Anggota dan tanggungan berstatus meninggal — pilihan cepat saat menambah kejadian. */
export function pilihanAlmarhum(): Array<{ kunci: string; nama: string; keterangan: string; tanggalMeninggal: string | null; anggotaId: number; anggotaKeluargaId: number | null }> {
  const a = db
    .select({ id: anggota.id, nama: anggota.nama, nomor: anggota.nomor, tanggalMeninggal: anggota.tanggalMeninggal })
    .from(anggota)
    .where(eq(anggota.status, 'meninggal'))
    .orderBy(asc(anggota.nama))
    .all()
    .map((x) => ({ kunci: `a-${x.id}`, nama: x.nama, keterangan: `Anggota${x.nomor ? ` · ${x.nomor}` : ''}`, tanggalMeninggal: x.tanggalMeninggal, anggotaId: x.id, anggotaKeluargaId: null }))
  const k = db
    .select({ id: anggotaKeluarga.id, nama: anggotaKeluarga.nama, hubungan: anggotaKeluarga.hubungan, tanggalMeninggal: anggotaKeluarga.tanggalMeninggal, anggotaId: anggotaKeluarga.anggotaId, namaAnggota: anggota.nama })
    .from(anggotaKeluarga)
    .innerJoin(anggota, eq(anggota.id, anggotaKeluarga.anggotaId))
    .where(and(eq(anggotaKeluarga.status, 'meninggal'), sql`${anggotaKeluarga.dihapusPada} is null`))
    .orderBy(asc(anggotaKeluarga.nama))
    .all()
    .map((x) => ({ kunci: `k-${x.id}`, nama: x.nama, keterangan: `${x.hubungan} dari ${x.namaAnggota}`, tanggalMeninggal: x.tanggalMeninggal, anggotaId: x.anggotaId, anggotaKeluargaId: x.id }))
  return [...a, ...k]
}
