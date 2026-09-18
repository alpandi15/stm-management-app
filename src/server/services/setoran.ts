import 'server-only'
import { and, asc, eq, isNull, like, sql } from 'drizzle-orm'
import { db, sqlite } from '@/server/db'
import { anggota, jenis, setoran, transaksi, type Setoran } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { buatCatatan, hapusCatatan } from './transaksi'
import { pastikanTidakTerkunci } from './penguncian'
import { formatPeriode, periodeUntuk, tambahBulan } from '@/lib/tanggal'
import type { Metode } from '@/server/db/schema'

/**
 * Setoran kolektif: satu kejadian pengutip menyetor iuran banyak anggota.
 * Satu catatan per anggota per periode (desain A), semuanya dalam SATU transaksi SQLite —
 * nomor bukti berurutan, log, penanda meninggal, kunci nominal, dan penguncian periode
 * berlaku otomatis karena tetap lewat buatCatatan().
 */

export type BarisSetoranInput = {
  anggotaId: number
  /** Berapa periode (bulan/tahun) yang dibayar; 1 untuk jenis tanpa periode */
  jumlahPeriode: number
  /** Nominal per periode (rupiah penuh) */
  nominal: number
}

export type InputSetoran = {
  jenisId: number
  tanggal: string
  /** Periode awal: 'YYYY-MM' (bulanan) / 'YYYY' (tahunan); kosong untuk jenis tanpa periode */
  periode?: string | null
  penyetorAnggotaId?: number | null
  keterangan: string
  metode: Metode
  buktiFile?: string | null
  baris: BarisSetoranInput[]
}

/** SI-2026-0001 — urut per tahun, dihitung sebagai angka, di dalam transaksi. */
function nomorSetoranBerikutnya(tahun: number): string {
  const awalan = `SI-${tahun}-`
  const r = db
    .select({ n: sql<number | null>`max(cast(substr(${setoran.nomor}, ${awalan.length + 1}) as integer))` })
    .from(setoran)
    .where(like(setoran.nomor, `${awalan}%`))
    .get()
  return `${awalan}${String((r?.n ?? 0) + 1).padStart(4, '0')}`
}

export function buatSetoran(input: InputSetoran): { setoran: Setoran; jumlahCatatan: number; total: number } {
  if (input.baris.length === 0) throw new GalatPengguna('Belum ada anggota yang dicentang.', 'baris')
  const j = db.select().from(jenis).where(eq(jenis.id, input.jenisId)).get()
  if (!j || !j.aktif) throw new GalatPengguna('Pilihan jenis tidak sesuai. Pilih ulang dari daftar.', 'jenisId')
  if (j.arah !== 'masuk') throw new GalatPengguna('Setoran kolektif hanya untuk uang masuk.', 'jenisId')
  pastikanTidakTerkunci(input.tanggal)
  const keterangan = input.keterangan.trim()
  if (keterangan.length < 3) throw new GalatPengguna('Keterangan belum diisi. Tulis singkat untuk apa uang ini.', 'keterangan')

  const berperiode = j.periode === 'bulanan' || j.periode === 'tahunan'
  const periodeAwal = berperiode ? periodeUntuk(j.periode, input.tanggal, input.periode) : null
  for (const b of input.baris) {
    if (!Number.isInteger(b.jumlahPeriode) || b.jumlahPeriode < 1 || b.jumlahPeriode > 36) throw new GalatPengguna('Jumlah bulan/tahun per anggota harus 1 sampai 36.', 'baris')
    if (!berperiode && b.jumlahPeriode !== 1) throw new GalatPengguna('Jenis ini tidak berperiode; jumlah bulan harus 1.', 'baris')
    if (!Number.isInteger(b.nominal) || b.nominal < 1) throw new GalatPengguna('Nominal per anggota harus lebih dari nol.', 'baris')
  }
  const idAnggota = new Set(input.baris.map((b) => b.anggotaId))
  if (idAnggota.size !== input.baris.length) throw new GalatPengguna('Ada anggota yang dicentang dua kali.', 'baris')

  const sekarang = Date.now()
  const tahun = Number(input.tanggal.slice(0, 4))

  return sqlite.transaction(() => {
    const kepala = db
      .insert(setoran)
      .values({
        nomor: nomorSetoranBerikutnya(tahun),
        tanggal: input.tanggal,
        jenisId: j.id,
        periode: periodeAwal,
        penyetorAnggotaId: input.penyetorAnggotaId ?? null,
        keterangan,
        metode: input.metode,
        buktiFile: input.buktiFile ?? null,
        dibuatPada: sekarang,
        diubahPada: sekarang,
      })
      .returning()
      .get()

    let jumlahCatatan = 0
    let total = 0
    for (const b of input.baris) {
      const a = db.select({ id: anggota.id, nama: anggota.nama }).from(anggota).where(eq(anggota.id, b.anggotaId)).get()
      if (!a) throw new GalatPengguna('Ada anggota yang tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'baris')
      for (let k = 0; k < b.jumlahPeriode; k++) {
        let periode: string | null = null
        let ket = keterangan
        if (periodeAwal) {
          periode = j.periode === 'bulanan' ? tambahBulan(periodeAwal, k) : String(Number(periodeAwal) + k)
          ket = `${keterangan} — ${formatPeriode(periode)}`
        }
        const hasil = buatCatatan(
          {
            tanggal: input.tanggal,
            arah: 'masuk',
            jenisId: j.id,
            keterangan: ket,
            anggotaId: a.id,
            namaPihak: a.nama,
            penyetorAnggotaId: input.penyetorAnggotaId ?? null,
            periode,
            jumlah: b.nominal,
            metode: input.metode,
            buktiFile: null,
            abaikanDuplikat: true, // daftar centang sudah menandai yang sudah bayar
          },
          { setoranId: kepala.id },
        )
        if (hasil.perluKonfirmasi) throw new GalatPengguna('Terjadi kesalahan tak terduga saat menyimpan.') // tidak tercapai: abaikanDuplikat
        jumlahCatatan += 1
        total += hasil.catatan.jumlah
      }
    }
    return { setoran: kepala, jumlahCatatan, total }
  })()
}

/** Hapus seluruh setoran: kepala ditandai terhapus, setiap catatannya dihapus lunak lewat service (log + penanda). */
export function hapusSetoran(id: number): { jumlahCatatan: number } {
  const s = db.select().from(setoran).where(and(eq(setoran.id, id), isNull(setoran.dihapusPada))).get()
  if (!s) throw new GalatPengguna('Setoran tidak ditemukan. Mungkin sudah dihapus.')
  pastikanTidakTerkunci(s.tanggal)
  return sqlite.transaction(() => {
    const baris = db
      .select({ id: transaksi.id })
      .from(transaksi)
      .where(and(eq(transaksi.setoranId, id), isNull(transaksi.dihapusPada)))
      .orderBy(asc(transaksi.id))
      .all()
    for (const b of baris) hapusCatatan(b.id)
    db.update(setoran).set({ dihapusPada: Date.now(), diubahPada: Date.now() }).where(eq(setoran.id, id)).run()
    return { jumlahCatatan: baris.length }
  })()
}
