/**
 * Fungsi murni untuk grafik laporan — dipakai komponen layar (Recharts) dan dokumen cetak
 * (SVG). Ditaruh di lib/ supaya bisa diuji tanpa merender apa pun.
 */
import { dariISO, formatBulan, formatTanggalPendek, type TanggalISO } from './tanggal'

export type TitikDeret = { kunci: string; label: string; masuk: number; keluar: number }
export type TitikSaldo = TitikDeret & { saldo: number }

/** Rentang panjang dirangkum per bulan; rentang ≤ 62 hari ditampilkan per hari. */
export function satuanDeret(awal: TanggalISO, akhir: TanggalISO): 'hari' | 'bulan' {
  const hari = Math.round((dariISO(akhir).getTime() - dariISO(awal).getTime()) / 86_400_000) + 1
  return hari <= 62 ? 'hari' : 'bulan'
}

export function labelTitik(kunci: string, satuan: 'hari' | 'bulan'): string {
  return satuan === 'hari' ? formatTanggalPendek(kunci as TanggalISO) : formatBulan(`${kunci}-01` as TanggalISO)
}

/** Satuan sebuah deret dibaca dari bentuk kuncinya: "2026-09" bulanan, "2026-09-05" harian. */
export function satuanDariKunci(kunci: string | undefined): 'hari' | 'bulan' {
  return (kunci?.length ?? 10) <= 7 ? 'bulan' : 'hari'
}

/** Saldo berjalan: sisa kas awal + akumulasi (masuk − keluar) tiap titik. */
export function deretSaldo(deret: TitikDeret[], sisaAwal: number): TitikSaldo[] {
  let saldo = sisaAwal
  return deret.map((d) => {
    saldo += d.masuk - d.keluar
    return { ...d, saldo }
  })
}

/** Angka ringkas untuk sumbu grafik: 1.250.000 → "1,25 jt", 75.000 → "75 rb". */
export function rupiahRingkas(n: number): string {
  const tanda = n < 0 ? '−' : ''
  const a = Math.abs(n)
  if (a >= 1_000_000_000) return `${tanda}${bulat(a / 1_000_000_000)} M`
  if (a >= 1_000_000) return `${tanda}${bulat(a / 1_000_000)} jt`
  if (a >= 1_000) return `${tanda}${bulat(a / 1_000)} rb`
  return `${tanda}${a}`
}

function bulat(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('id-ID')
}

/**
 * Skala sumbu Y yang "bulat": batas atas dinaikkan ke kelipatan enak (1/2/2,5/5 × 10^n)
 * supaya garis bantu jatuh di angka yang mudah dibaca.
 */
export function skalaY(maks: number, bagian = 4): { maks: number; garis: number[] } {
  if (maks <= 0) return { maks: 1, garis: [0, 1] }
  const kasar = maks / bagian
  const pangkat = 10 ** Math.floor(Math.log10(kasar))
  const sisa = kasar / pangkat
  const langkah = (sisa > 5 ? 10 : sisa > 2.5 ? 5 : sisa > 2 ? 2.5 : sisa > 1 ? 2 : 1) * pangkat
  const atas = Math.ceil(maks / langkah) * langkah
  const garis: number[] = []
  for (let v = 0; v <= atas + langkah / 2; v += langkah) garis.push(Math.round(v))
  return { maks: atas, garis }
}
