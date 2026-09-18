import 'server-only'
import { and, asc, count, desc, gte, inArray, isNotNull, lte } from 'drizzle-orm'
import { dariISO, type Rentang } from '@/lib/tanggal'
import { db } from '@/server/db'
import { jenis, log, transaksi, type AksiLog, type Transaksi } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'

export const PER_HALAMAN_RIWAYAT = 50

/** Satu field yang berubah, sudah dalam bentuk siap tampil (docs/01 §5.7). */
export type Perubahan = { label: string; sebelum: string; sesudah: string }

export type EntriRiwayat = {
  id: number
  waktu: number
  aksi: AksiLog
  transaksiId: number | null
  noBukti: string
  ringkasan: string
  arah: 'masuk' | 'keluar' | null
  perubahan: Perubahan[]
  /** true bila entri hapus dan catatannya masih terhapus → tombol Kembalikan */
  bisaDikembalikan: boolean
}

export type HariRiwayat = { tanggal: string; entri: EntriRiwayat[] }

function bacaJson(s: string | null): Transaksi | null {
  if (!s) return null
  try {
    return JSON.parse(s) as Transaksi
  } catch {
    return null
  }
}

/**
 * Perbandingan Sebelum → Sesudah, hanya field yang berubah. Dihitung di sini (saat
 * menampilkan), bukan saat menyimpan — supaya cara membacanya bisa diubah di kemudian hari.
 */
function hitungPerubahan(lama: Transaksi, baru: Transaksi, namaJenis: Map<number, string>): Perubahan[] {
  const hasil: Perubahan[] = []
  const banding = (label: string, a: string, b: string) => {
    if (a !== b) hasil.push({ label, sebelum: a, sesudah: b })
  }
  banding('Tanggal', formatTanggal(lama.tanggal), formatTanggal(baru.tanggal))
  banding('Untuk apa', namaJenis.get(lama.jenisId) ?? `#${lama.jenisId}`, namaJenis.get(baru.jenisId) ?? `#${baru.jenisId}`)
  banding('Keterangan', lama.keterangan, baru.keterangan)
  banding('Dari / untuk siapa', lama.namaPihak ?? '—', baru.namaPihak ?? '—')
  banding('Jumlah', formatRupiah(lama.jumlah), formatRupiah(baru.jumlah))
  banding('Cara bayar', lama.metode === 'tunai' ? 'Tunai' : 'Transfer', baru.metode === 'tunai' ? 'Tunai' : 'Transfer')
  banding('Foto bukti', lama.buktiFile ? 'Ada' : 'Tidak ada', baru.buktiFile ? 'Ada' : 'Tidak ada')
  return hasil
}

function ringkasanBaris(t: Transaksi | null, namaJenis: Map<number, string>): string {
  if (!t) return ''
  const arah = t.arah === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'
  return `${arah} · ${namaJenis.get(t.jenisId) ?? 'Jenis'} · ${formatRupiah(t.jumlah)} · ${formatTanggal(t.tanggal)}`
}

/** Linimasa riwayat, terbaru dulu, dikelompokkan per hari (docs/01 §5.7). */
export function daftarRiwayat(halaman = 1): { hari: HariRiwayat[]; total: number } {
  const total = db.select({ n: count() }).from(log).get()?.n ?? 0
  const baris = db
    .select()
    .from(log)
    .orderBy(desc(log.dibuatPada), desc(log.id))
    .limit(PER_HALAMAN_RIWAYAT)
    .offset((halaman - 1) * PER_HALAMAN_RIWAYAT)
    .all()

  const namaJenis = new Map(db.select({ id: jenis.id, nama: jenis.nama }).from(jenis).all().map((j) => [j.id, j.nama]))

  // Status terhapus saat ini untuk entri "hapus" — menentukan tombol Kembalikan
  const idHapus = [...new Set(baris.filter((b) => b.aksi === 'hapus' && b.transaksiId).map((b) => b.transaksiId as number))]
  const masihTerhapus = new Set(
    idHapus.length
      ? db
          .select({ id: transaksi.id })
          .from(transaksi)
          .where(and(inArray(transaksi.id, idHapus), isNotNull(transaksi.dihapusPada)))
          .all()
          .map((t) => t.id)
      : [],
  )

  const entri: EntriRiwayat[] = baris.map((b) => {
    const lama = bacaJson(b.dataLama)
    const baru = bacaJson(b.dataBaru)
    const acuan = baru ?? lama
    return {
      id: b.id,
      waktu: b.dibuatPada,
      aksi: b.aksi,
      transaksiId: b.transaksiId,
      noBukti: b.noBukti ?? '',
      ringkasan: ringkasanBaris(acuan, namaJenis),
      arah: acuan?.arah ?? null,
      perubahan: b.aksi === 'ubah' && lama && baru ? hitungPerubahan(lama, baru, namaJenis) : [],
      bisaDikembalikan: b.aksi === 'hapus' && b.transaksiId != null && masihTerhapus.has(b.transaksiId),
    }
  })

  // Kelompokkan per hari (waktu lokal)
  const hari: HariRiwayat[] = []
  for (const e of entri) {
    const d = new Date(e.waktu)
    const tanggal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const terakhir = hari[hari.length - 1]
    if (terakhir && terakhir.tanggal === tanggal) terakhir.entri.push(e)
    else hari.push({ tanggal, entri: [e] })
  }
  return { hari, total }
}

/** Seluruh log urut waktu naik — untuk pemutaran ulang di Pemeriksaan Kas. */
export function semuaLogUrut(): Array<{ aksi: AksiLog; lama: Transaksi | null; baru: Transaksi | null }> {
  return db
    .select({ aksi: log.aksi, dataLama: log.dataLama, dataBaru: log.dataBaru })
    .from(log)
    .orderBy(asc(log.dibuatPada), asc(log.id))
    .all()
    .map((b) => ({ aksi: b.aksi, lama: bacaJson(b.dataLama), baru: bacaJson(b.dataBaru) }))
}

/** Entri log yang waktunya jatuh dalam rentang tanggal (waktu lokal) — untuk Berita Acara Pemeriksaan. */
export function perubahanDalamRentang(rentang: Rentang): EntriRiwayat[] {
  const mulai = dariISO(rentang.awal).getTime()
  const akhir = dariISO(rentang.akhir).getTime() + 24 * 60 * 60 * 1000 - 1
  const namaJenis = new Map(db.select({ id: jenis.id, nama: jenis.nama }).from(jenis).all().map((j) => [j.id, j.nama]))
  return db
    .select()
    .from(log)
    .where(and(gte(log.dibuatPada, mulai), lte(log.dibuatPada, akhir)))
    .orderBy(asc(log.dibuatPada), asc(log.id))
    .all()
    .map((b) => {
      const lama = bacaJson(b.dataLama)
      const baru = bacaJson(b.dataBaru)
      const acuan = baru ?? lama
      return {
        id: b.id,
        waktu: b.dibuatPada,
        aksi: b.aksi,
        transaksiId: b.transaksiId,
        noBukti: b.noBukti ?? '',
        ringkasan: ringkasanBaris(acuan, namaJenis),
        arah: acuan?.arah ?? null,
        perubahan: b.aksi === 'ubah' && lama && baru ? hitungPerubahan(lama, baru, namaJenis) : [],
        bisaDikembalikan: false,
      }
    })
}
