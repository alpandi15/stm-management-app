import { apakahISO, hariIni, rentangPeriode, PERIODE, type Periode, type Rentang } from '@/lib/tanggal'
import type { Metode } from '@/server/db/schema'

type Params = Record<string, string | undefined>

export type ParameterLaporan = {
  periode: Periode
  acuan: string
  rentang: Rentang
  jenisId?: number
  metode?: Metode
}

/**
 * Menerjemahkan searchParams halaman Laporan (dan dokumen cetak) menjadi periode, rentang,
 * dan penyaring. Nilai tak sah jatuh ke bawaan: bulanan, hari ini.
 */
export function bacaParameterLaporan(sp: Params): ParameterLaporan {
  const periode: Periode = (PERIODE as readonly string[]).includes(sp.periode ?? '') ? (sp.periode as Periode) : 'bulanan'
  const acuan = apakahISO(sp.acuan ?? '') ? (sp.acuan as string) : hariIni()
  const jenisId = Number(sp.jenis) || undefined
  const metode: Metode | undefined = sp.metode === 'tunai' || sp.metode === 'transfer' ? sp.metode : undefined

  let rentang: Rentang
  if (periode === 'pilih') {
    const bulan = rentangPeriode('bulanan', acuan)
    const a = apakahISO(sp.awal ?? '') ? (sp.awal as string) : bulan.awal
    const b = apakahISO(sp.akhir ?? '') ? (sp.akhir as string) : bulan.akhir
    rentang = a <= b ? { awal: a, akhir: b } : { awal: b, akhir: a }
  } else {
    rentang = rentangPeriode(periode, acuan)
  }
  return { periode, acuan, rentang, jenisId, metode }
}
