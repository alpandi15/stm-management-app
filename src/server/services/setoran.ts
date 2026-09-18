import 'server-only'
import { and, asc, eq, isNull, like, sql } from 'drizzle-orm'
import { db, sqlite } from '@/server/db'
import { anggota, jenis, setoran, transaksi, type Jenis, type Setoran } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { buatCatatan, hapusCatatan } from './transaksi'
import { pastikanTidakTerkunci } from './penguncian'
import { formatPeriode, periodeUntuk, tambahBulan } from '@/lib/tanggal'
import type { Metode } from '@/server/db/schema'

/**
 * Setoran kolektif: satu kejadian pengutip menyetor uang banyak anggota, boleh banyak jenis.
 * Rincian = kartu per anggota (atau kartu tanpa nama) berisi baris jenis. Setiap baris
 * menjadi catatan: jenis berperiode → satu catatan per periode; jenis lain → satu catatan
 * bernilai nominal × kelipatan (mis. iuran duka untuk 3 almarhum).
 * Semua dalam SATU transaksi SQLite lewat buatCatatan() — nomor bukti, log, penanda,
 * kunci nominal, penguncian berlaku otomatis.
 */

export type BarisJenisInput = {
  jenisId: number
  /** 'YYYY-MM' / 'YYYY' untuk jenis berperiode; kosong = mengikuti tanggal setor */
  periode?: string | null
  /** Berapa periode dibayar (jenis berperiode) — n catatan */
  jumlahPeriode?: number
  /** Kelipatan untuk jenis tanpa periode (mis. jumlah almarhum) — 1 catatan bernilai nominal × kelipatan */
  kelipatan?: number
  /** Nominal per periode / per satuan (rupiah penuh) */
  nominal: number
  /** Keterangan khusus baris (mis. nama almarhum); kosong = keterangan setoran */
  keterangan?: string | null
}

export type KartuInput = {
  /** null = kartu tanpa nama (uang gabungan yang tidak dirinci per anggota) */
  anggotaId: number | null
  baris: BarisJenisInput[]
}

export type InputSetoran = {
  tanggal: string
  penyetorAnggotaId?: number | null
  keterangan: string
  metode: Metode
  buktiFile?: string | null
  /** Jenis utama (informasi di daftar setoran) */
  jenisUtamaId?: number | null
  periodeUtama?: string | null
  kartu: KartuInput[]
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

function periksaBaris(b: BarisJenisInput, j: Jenis) {
  const berperiode = j.periode === 'bulanan' || j.periode === 'tahunan'
  const n = berperiode ? (b.jumlahPeriode ?? 1) : (b.kelipatan ?? 1)
  if (!Number.isInteger(n) || n < 1 || n > 60) throw new GalatPengguna(`Jumlah ${berperiode ? (j.periode === 'bulanan' ? 'bulan' : 'tahun') : 'kelipatan'} untuk ${j.nama} harus 1 sampai 60.`, 'kartu')
  if (!Number.isInteger(b.nominal) || b.nominal < 1) throw new GalatPengguna(`Nominal ${j.nama} harus lebih dari nol.`, 'kartu')
  return { berperiode, n }
}

export function buatSetoran(input: InputSetoran): { setoran: Setoran; jumlahCatatan: number; total: number } {
  const kartu = input.kartu.filter((k) => k.baris.length > 0)
  if (kartu.length === 0) throw new GalatPengguna('Belum ada anggota atau baris yang diisi.', 'kartu')
  pastikanTidakTerkunci(input.tanggal)
  const keterangan = input.keterangan.trim()
  if (keterangan.length < 3) throw new GalatPengguna('Keterangan belum diisi. Tulis singkat untuk apa uang ini.', 'keterangan')

  const semuaJenis = new Map(db.select().from(jenis).all().map((j) => [j.id, j]))
  const ambilJenis = (id: number) => {
    const j = semuaJenis.get(id)
    if (!j || !j.aktif) throw new GalatPengguna('Ada pilihan jenis yang tidak sesuai. Pilih ulang dari daftar.', 'kartu')
    if (j.arah !== 'masuk') throw new GalatPengguna(`${j.nama} adalah uang keluar; setoran kolektif hanya untuk uang masuk.`, 'kartu')
    return j
  }
  for (const k of kartu) for (const b of k.baris) periksaBaris(b, ambilJenis(b.jenisId))
  const idAnggota = kartu.map((k) => k.anggotaId).filter((x): x is number => x != null)
  if (new Set(idAnggota).size !== idAnggota.length) throw new GalatPengguna('Ada anggota yang muncul dua kali. Gabungkan barisnya dalam satu kartu.', 'kartu')

  const sekarang = Date.now()
  const tahun = Number(input.tanggal.slice(0, 4))
  const jenisUtama = input.jenisUtamaId ? semuaJenis.get(input.jenisUtamaId) : undefined

  return sqlite.transaction(() => {
    const kepala = db
      .insert(setoran)
      .values({
        nomor: nomorSetoranBerikutnya(tahun),
        tanggal: input.tanggal,
        jenisId: jenisUtama?.id ?? null,
        periode: jenisUtama && (jenisUtama.periode === 'bulanan' || jenisUtama.periode === 'tahunan') ? periodeUntuk(jenisUtama.periode, input.tanggal, input.periodeUtama) : null,
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
    for (const k of kartu) {
      const a = k.anggotaId ? db.select({ id: anggota.id, nama: anggota.nama }).from(anggota).where(eq(anggota.id, k.anggotaId)).get() : null
      if (k.anggotaId && !a) throw new GalatPengguna('Ada anggota yang tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'kartu')
      for (const b of k.baris) {
        const j = ambilJenis(b.jenisId)
        const { berperiode, n } = periksaBaris(b, j)
        // Keterangan baris: khusus baris bila ada; bila keterangan setoran hanya nama jenis
        // utama (otomatis), baris jenis lain memakai nama jenisnya sendiri.
        const ketBaris =
          b.keterangan?.trim() || (keterangan === j.nama ? keterangan : jenisUtama && keterangan === jenisUtama.nama ? j.nama : `${keterangan} — ${j.nama}`)
        const simpan = (periode: string | null, ket: string, jumlah: number, kelipatan = 1) => {
          const hasil = buatCatatan(
            {
              tanggal: input.tanggal,
              arah: 'masuk',
              jenisId: j.id,
              keterangan: ket,
              anggotaId: a?.id ?? null,
              namaPihak: a?.nama ?? null,
              penyetorAnggotaId: input.penyetorAnggotaId ?? null,
              periode,
              jumlah,
              metode: input.metode,
              buktiFile: null,
              abaikanDuplikat: true, // daftar centang sudah menandai yang sudah bayar
            },
            { setoranId: kepala.id, kelipatan },
          )
          if (hasil.perluKonfirmasi) throw new GalatPengguna('Terjadi kesalahan tak terduga saat menyimpan.')
          jumlahCatatan += 1
          total += hasil.catatan.jumlah
        }
        if (berperiode && !a) {
          // Kartu tanpa nama: n = jumlah orang, satu catatan untuk periode itu bernilai nominal × n
          const awal = periodeUntuk(j.periode, input.tanggal, b.periode)!
          simpan(awal, `${ketBaris} — ${formatPeriode(awal)}${n > 1 ? ` (${n} orang)` : ''}`, b.nominal * n, n)
        } else if (berperiode) {
          const awal = periodeUntuk(j.periode, input.tanggal, b.periode)!
          for (let i = 0; i < n; i++) {
            const periode = j.periode === 'bulanan' ? tambahBulan(awal, i) : String(Number(awal) + i)
            simpan(periode, `${ketBaris} — ${formatPeriode(periode)}`, b.nominal)
          }
        } else {
          simpan(null, ketBaris, b.nominal * n, n)
        }
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
