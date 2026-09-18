// Satu-satunya tempat uang diformat (docs/02 §10). Tidak ada toLocaleString di komponen.

/** `1250000` → `Rp 1.250.000`. Angka negatif → `-Rp 250.000`. */
export function formatRupiah(n: number): string {
  const bulat = Math.trunc(Math.abs(n))
  const digit = bulat.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '-' : ''}Rp ${digit}`
}

/** `1250000` → `1.250.000` (tanpa awalan, untuk kolom angka dan input). */
export function formatAngka(n: number): string {
  return Math.trunc(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Membaca ketikan pengguna: `"1.250.000"`, `"Rp 1.250.000"`, `"1250000"` → `1250000`. */
export function parseRupiah(teks: string): number {
  const digit = teks.replace(/[^\d]/g, '')
  return digit === '' ? 0 : Number(digit)
}

const SATUAN = [
  '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
  'sepuluh', 'sebelas',
]

/** Terbilang untuk 0 – 999 (tanpa kata "ribu/juta"). */
function terbilangRatusan(n: number): string {
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${SATUAN[n - 10]} belas`
  if (n < 100) {
    const sisa = n % 10
    return `${SATUAN[Math.floor(n / 10)]} puluh${sisa ? ` ${SATUAN[sisa]}` : ''}`
  }
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  const awal = ratus === 1 ? 'seratus' : `${SATUAN[ratus]} ratus`
  return sisa ? `${awal} ${terbilangRatusan(sisa)}` : awal
}

const KELOMPOK: ReadonlyArray<[number, string]> = [
  [1_000_000_000_000, 'triliun'],
  [1_000_000_000, 'miliar'],
  [1_000_000, 'juta'],
  [1_000, 'ribu'],
]

/**
 * Terbilang rekursif dalam Bahasa Indonesia, huruf kecil semua, tanpa kata "rupiah".
 * `1250000` → "satu juta dua ratus lima puluh ribu"; `0` → "nol".
 * Mengikuti kaidah "seribu" (bukan "satu ribu") dan "seratus".
 */
export function terbilang(n: number): string {
  const bulat = Math.trunc(Math.abs(n))
  if (bulat === 0) return 'nol'
  const hasil = terbilangPositif(bulat)
  return n < 0 ? `minus ${hasil}` : hasil
}

function terbilangPositif(n: number): string {
  if (n < 1000) return terbilangRatusan(n)
  for (const [nilai, nama] of KELOMPOK) {
    if (n >= nilai) {
      const depan = Math.floor(n / nilai)
      const sisa = n % nilai
      const awal = depan === 1 && nama === 'ribu' ? 'seribu' : `${terbilangPositif(depan)} ${nama}`
      return sisa ? `${awal} ${terbilangPositif(sisa)}` : awal
    }
  }
  return terbilangRatusan(n) // tidak tercapai; menenangkan TypeScript
}

/** Kalimat di bawah kolom jumlah: "Satu juta dua ratus lima puluh ribu rupiah". */
export function terbilangRupiah(n: number): string {
  const kata = terbilang(n)
  return `${kata.charAt(0).toUpperCase()}${kata.slice(1)} rupiah`
}
