/** Urutan daftar catatan (URL `?urut=`): bawaan waktu dicatat terbaru dulu; tanggal transaksi juga bisa. */
export const URUT_CATATAN = ['dibuat-desc', 'dibuat-asc', 'tanggal-desc', 'tanggal-asc'] as const
export type UrutCatatan = (typeof URUT_CATATAN)[number]
export const URUT_BAWAAN: UrutCatatan = 'dibuat-desc'

export function bacaUrut(v: string | undefined): UrutCatatan {
  return (URUT_CATATAN as readonly string[]).includes(v ?? '') ? (v as UrutCatatan) : URUT_BAWAAN
}
