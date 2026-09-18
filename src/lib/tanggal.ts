// Satu-satunya tempat tanggal diformat dan rentang periode dihitung (docs/02 §6.1, §10).
// Seluruh perhitungan memakai waktu lokal, tidak pernah UTC.
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns'
import { id } from 'date-fns/locale'

/** Bentuk tanggal di database dan URL: 'YYYY-MM-DD'. */
export type TanggalISO = string

export const PERIODE = ['harian', 'mingguan', 'bulanan', 'tahunan', 'pilih'] as const
export type Periode = (typeof PERIODE)[number]

export type Rentang = { awal: TanggalISO; akhir: TanggalISO }

// Minggu dimulai hari Senin — konvensi Indonesia
const OPSI_MINGGU = { weekStartsOn: 1 as const }

/** Date (waktu lokal) → 'YYYY-MM-DD'. */
export function keISO(d: Date): TanggalISO {
  return format(d, 'yyyy-MM-dd')
}

/** 'YYYY-MM-DD' → Date pada pukul 00:00 waktu lokal. Lempar galat bila bentuknya salah. */
export function dariISO(s: TanggalISO): Date {
  const d = parse(s, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) throw new Error(`Tanggal tidak sah: ${s}`)
  return d
}

export function apakahISO(s: string): s is TanggalISO {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parse(s, 'yyyy-MM-dd', new Date()))
}

export function hariIni(): TanggalISO {
  return keISO(new Date())
}

export function kemarin(): TanggalISO {
  return keISO(addDays(new Date(), -1))
}

/** Rentang periode dari tanggal acuan (docs/02 §6.1). Untuk 'pilih' gunakan input pengguna. */
export function rentangPeriode(periode: Exclude<Periode, 'pilih'>, acuan: TanggalISO): Rentang {
  const d = dariISO(acuan)
  switch (periode) {
    case 'harian':
      return { awal: acuan, akhir: acuan }
    case 'mingguan':
      return { awal: keISO(startOfWeek(d, OPSI_MINGGU)), akhir: keISO(endOfWeek(d, OPSI_MINGGU)) }
    case 'bulanan':
      return { awal: keISO(startOfMonth(d)), akhir: keISO(endOfMonth(d)) }
    case 'tahunan':
      return { awal: keISO(startOfYear(d)), akhir: keISO(endOfYear(d)) }
  }
}

export function rentangBulanIni(): Rentang {
  return rentangPeriode('bulanan', hariIni())
}

export function rentangBulanLalu(): Rentang {
  return rentangPeriode('bulanan', keISO(subMonths(new Date(), 1)))
}

export function rentangTahunIni(): Rentang {
  return rentangPeriode('tahunan', hariIni())
}

/** '2026-01-20' → '20 Januari 2026'. */
export function formatTanggal(s: TanggalISO): string {
  return format(dariISO(s), 'd MMMM yyyy', { locale: id })
}

/** '2026-01-05' → '05 Jan 2026' (untuk kartu catatan yang padat). */
export function formatTanggalPendek(s: TanggalISO): string {
  return format(dariISO(s), 'dd MMM yyyy', { locale: id })
}

/** '2026-01-20' → 'Selasa, 20 Januari 2026'. */
export function formatTanggalLengkap(s: TanggalISO): string {
  return format(dariISO(s), 'EEEE, d MMMM yyyy', { locale: id })
}

/** '2026-01' bulan → 'Januari 2026'. */
export function formatBulan(s: TanggalISO): string {
  return format(dariISO(s), 'MMMM yyyy', { locale: id })
}

/** Unix ms → '20 Jan 2026, 14.05'. */
export function formatWaktu(ms: number): string {
  return format(new Date(ms), 'd MMM yyyy, HH.mm', { locale: id })
}

/** Unix ms → '14.05' saja (untuk linimasa per hari). */
export function formatJam(ms: number): string {
  return format(new Date(ms), 'HH.mm', { locale: id })
}

/** Kalimat penegas di halaman laporan: "1 Januari 2026 sampai 31 Januari 2026". */
export function kalimatRentang(r: Rentang): string {
  if (r.awal === r.akhir) return formatTanggal(r.awal)
  return `${formatTanggal(r.awal)} sampai ${formatTanggal(r.akhir)}`
}

/** Pilihan cepat di baris penyaring Catatan Kas (docs/01 §5.4). */
export const PILIHAN_RENTANG = ['bulan-ini', 'bulan-lalu', 'tahun-ini', 'pilih'] as const
export type PilihanRentang = (typeof PILIHAN_RENTANG)[number]

export function apakahPilihanRentang(s: string): s is PilihanRentang {
  return (PILIHAN_RENTANG as readonly string[]).includes(s)
}

/** Menerjemahkan pilihan cepat (+ tanggal bebas) menjadi rentang; tanggal terbalik dibetulkan. */
export function tentukanRentang(pilihan: PilihanRentang, awal: string, akhir: string): Rentang {
  switch (pilihan) {
    case 'bulan-lalu':
      return rentangBulanLalu()
    case 'tahun-ini':
      return rentangTahunIni()
    case 'pilih': {
      const bulan = rentangBulanIni()
      const a = apakahISO(awal) ? awal : bulan.awal
      const b = apakahISO(akhir) ? akhir : bulan.akhir
      return a <= b ? { awal: a, akhir: b } : { awal: b, akhir: a }
    }
    default:
      return rentangBulanIni()
  }
}

/** Periode bulanan 'YYYY-MM' dari tanggal. */
export function bulanDari(t: TanggalISO): string {
  return t.slice(0, 7)
}

/** Menambah n bulan ke periode 'YYYY-MM'. */
export function tambahBulan(periode: string, n: number): string {
  const [y, m] = periode.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** 'YYYY-MM' → 'Oktober 2026'; 'YYYY' → '2026'. */
export function formatPeriode(periode: string): string {
  return periode.length === 7 ? formatBulan(`${periode}-01`) : periode
}

/** Periode yang dibayar oleh sebuah catatan berdasarkan periode jenisnya; null bila bebas/sekali. */
export function periodeUntuk(periodeJenis: 'bebas' | 'sekali' | 'bulanan' | 'tahunan', tanggal: TanggalISO, eksplisit?: string | null): string | null {
  if (periodeJenis === 'bulanan') return eksplisit && /^\d{4}-\d{2}$/.test(eksplisit) ? eksplisit : bulanDari(tanggal)
  if (periodeJenis === 'tahunan') return eksplisit && /^\d{4}$/.test(eksplisit) ? eksplisit : tanggal.slice(0, 4)
  return null
}
