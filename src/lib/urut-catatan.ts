/** Urutan daftar catatan (URL `?urut=`): bawaan waktu dicatat terbaru dulu; tanggal transaksi juga bisa. */
export const URUT_CATATAN = ['dibuat-desc', 'dibuat-asc', 'tanggal-desc', 'tanggal-asc'] as const
export type UrutCatatan = (typeof URUT_CATATAN)[number]
/** Catatan Kas: urutan pencatatan (seperti buku manual bendahara). */
export const URUT_BAWAAN: UrutCatatan = 'dibuat-desc'
/** Laporan: tanggal transaksi terbaru dulu — laporan dibaca menurut tanggal kejadiannya. */
export const URUT_BAWAAN_LAPORAN: UrutCatatan = 'tanggal-desc'

export function bacaUrut(v: string | undefined, bawaan: UrutCatatan = URUT_BAWAAN): UrutCatatan {
  return (URUT_CATATAN as readonly string[]).includes(v ?? '') ? (v as UrutCatatan) : bawaan
}

/** Pilihan jumlah baris per halaman (URL `?n=`); bawaan 25. */
export const PER_HALAMAN_PILIHAN = [10, 25, 50, 100] as const
export const PER_HALAMAN_BAWAAN = 25
export function bacaPerHalaman(v: string | undefined): number {
  const n = Number(v)
  return (PER_HALAMAN_PILIHAN as readonly number[]).includes(n) ? n : PER_HALAMAN_BAWAAN
}
