/** Konstanta daftar anggota yang dipakai server maupun klien (bukan di modul server-only). */
export const PER_HALAMAN_ANGGOTA = 25
export const SARING_ANGGOTA = ['semua', 'aktif', 'nonaktif', 'meninggal', 'pengutip', 'nunggak-duka'] as const
export type SaringAnggota = (typeof SARING_ANGGOTA)[number]
