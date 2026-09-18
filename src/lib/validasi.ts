// Skema Zod bersama: dipakai di form (kenyamanan) dan di Server Action (yang menentukan).
// Pesan galat berupa kalimat dengan jalan keluar (docs/01 P7), bukan "Required".
import { z } from 'zod'
import { apakahISO } from './tanggal'

export const ARAH = ['masuk', 'keluar'] as const
export const METODE = ['tunai', 'transfer'] as const

/** Batas nominal (docs/02 §5.1): 1 – 999.999.999.999 rupiah penuh. */
export const JUMLAH_MAKS = 999_999_999_999

export const skemaTanggal = z
  .string({ error: 'Tanggal belum diisi.' })
  .refine(apakahISO, 'Tanggal tidak dikenali. Pilih dari kalender.')

export const skemaJumlah = z
  .number({ error: 'Jumlah uang belum diisi.' })
  .int('Jumlah uang harus bilangan bulat, tanpa koma.')
  .min(1, 'Jumlah uang harus lebih dari nol.')
  .max(JUMLAH_MAKS, 'Jumlah uang terlalu besar. Periksa kembali angkanya.')

export const skemaCatatan = z.object({
  tanggal: skemaTanggal,
  arah: z.enum(ARAH, { error: 'Pilih dulu Uang Masuk atau Uang Keluar.' }),
  jenisId: z
    .number({ error: 'Pilih dulu untuk apa uang ini.' })
    .int()
    .positive('Pilih dulu untuk apa uang ini.'),
  keterangan: z
    .string({ error: 'Keterangan belum diisi. Tulis singkat untuk apa uang ini.' })
    .trim()
    .min(3, 'Keterangan belum diisi. Tulis singkat untuk apa uang ini.')
    .max(255, 'Keterangan terlalu panjang. Maksimal 255 huruf.'),
  anggotaId: z.number().int().positive().nullable().optional(),
  namaPihak: z.string().trim().max(120, 'Nama terlalu panjang. Maksimal 120 huruf.').nullable().optional(),
  jumlah: skemaJumlah,
  metode: z.enum(METODE, { error: 'Pilih cara pembayarannya.' }),
  buktiFile: z.string().nullable().optional(),
  abaikanDuplikat: z.boolean().optional(),
})
export type InputCatatan = z.infer<typeof skemaCatatan>

export const skemaPin = z
  .string({ error: 'PIN belum diisi.' })
  .regex(/^\d{6}$/, 'PIN harus 6 angka.')

export const skemaNama = z
  .string({ error: 'Nama belum diisi.' })
  .trim()
  .min(3, 'Nama terlalu pendek. Tulis minimal 3 huruf.')
  .max(120, 'Nama terlalu panjang. Maksimal 120 huruf.')

export const skemaAnggota = z.object({
  nama: skemaNama,
  noHp: z.string().trim().max(30, 'Nomor HP terlalu panjang.').nullable().optional(),
  alamat: z.string().trim().max(255, 'Alamat terlalu panjang.').nullable().optional(),
})
export type InputAnggota = z.infer<typeof skemaAnggota>

export const skemaJenis = z.object({
  nama: skemaNama,
  arah: z.enum(ARAH, { error: 'Pilih dulu Uang Masuk atau Uang Keluar.' }),
  keterangan: z.string().trim().max(255, 'Keterangan terlalu panjang.').nullable().optional(),
})
export type InputJenis = z.infer<typeof skemaJenis>

/** Ukuran maksimum foto bukti: 5 MB (docs/02 §5.1). */
export const BUKTI_MAKS_BYTE = 5 * 1024 * 1024
export const BUKTI_TIPE = ['image/jpeg', 'image/png', 'image/webp'] as const
