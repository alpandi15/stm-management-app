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
  anggotaKeluargaId: z.number({ error: 'Anggota keluarga yang dipilih tidak dikenali. Pilih ulang dari daftar.' }).int().positive().nullable().optional(),
  penyetorAnggotaId: z.number({ error: 'Penyetor yang dipilih tidak dikenali. Pilih ulang dari daftar.' }).int().positive().nullable().optional(),
  /** 'YYYY-MM' untuk jenis bulanan, 'YYYY' untuk tahunan; kosong = mengikuti tanggal */
  periode: z
    .string()
    .nullable()
    .optional()
    .refine((v) => !v || /^\d{4}(-\d{2})?$/.test(v), 'Periode tidak dikenali. Pilih ulang dari daftar.'),
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

export const STATUS_HIDUP = ['aktif', 'meninggal'] as const
export const HUBUNGAN = ['Istri', 'Suami', 'Anak', 'Orang Tua', 'Mertua', 'Saudara', 'Lainnya'] as const
export const PERIODE_JENIS = ['bebas', 'sekali', 'bulanan', 'tahunan'] as const

const skemaTanggalOpsional = z
  .string()
  .nullable()
  .optional()
  .refine((v) => !v || apakahISO(v), 'Tanggal belum terbaca. Pilih tanggalnya dari kalender.')

export const skemaAnggota = z
  .object({
    nomor: z.string().trim().max(30, 'Nomor anggota terlalu panjang. Maksimal 30 huruf.').nullable().optional(),
    nama: skemaNama,
    noHp: z.string().trim().max(30, 'Nomor HP terlalu panjang.').nullable().optional(),
    alamat: z.string().trim().max(255, 'Alamat terlalu panjang.').nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    pengutip: z.boolean().optional(),
    status: z.enum(STATUS_HIDUP, { error: 'Pilih dulu orang ini masih hidup atau sudah meninggal.' }).optional(),
    tanggalMeninggal: skemaTanggalOpsional,
  })
  .refine((v) => v.status !== 'meninggal' || !!v.tanggalMeninggal, { message: 'Isi tanggal meninggalnya.', path: ['tanggalMeninggal'] })
export type InputAnggota = z.infer<typeof skemaAnggota>

/** Tanggungan (Spec 2 §A2) — pesan wajib persis. */
export const skemaKeluarga = z
  .object({
    nama: z
      .string({ error: 'Nama anggota keluarga belum diisi.' })
      .trim()
      .min(1, 'Nama anggota keluarga belum diisi.')
      .max(100, 'Nama terlalu panjang. Persingkat sampai 100 huruf.'),
    hubungan: z.enum(HUBUNGAN, { error: 'Hubungan yang dipilih tidak dikenali. Pilih ulang dari daftar.' }),
    tanggalLahir: z
      .string()
      .nullable()
      .optional()
      .refine((v) => !v || apakahISO(v), 'Tanggal lahir belum terbaca. Pilih tanggalnya dari kalender.'),
    status: z.enum(STATUS_HIDUP, { error: 'Pilih dulu orang ini masih hidup atau sudah meninggal.' }),
    tanggalMeninggal: z
      .string()
      .nullable()
      .optional()
      .refine((v) => !v || apakahISO(v), 'Tanggal meninggal belum terbaca. Pilih tanggalnya dari kalender.'),
    keterangan: z.string().trim().max(255, 'Keterangan terlalu panjang. Persingkat sampai 255 huruf.').nullable().optional(),
  })
  .refine((v) => v.status !== 'meninggal' || !!v.tanggalMeninggal, { message: 'Isi tanggal meninggalnya.', path: ['tanggalMeninggal'] })
export type InputKeluarga = z.infer<typeof skemaKeluarga>

export const skemaJenis = z
  .object({
    nama: skemaNama,
    arah: z.enum(ARAH, { error: 'Pilih dulu Uang Masuk atau Uang Keluar.' }),
    keterangan: z.string().trim().max(255, 'Keterangan terlalu panjang.').nullable().optional(),
    nominalBawaan: z
      .number({ error: 'Nominal hanya boleh berisi angka.' })
      .int('Nominal hanya boleh berisi angka.')
      .min(1, 'Nominal harus lebih dari nol.')
      .max(JUMLAH_MAKS, 'Nominal terlalu besar. Coba periksa lagi banyaknya angka nol.')
      .nullable()
      .optional(),
    nominalDikunci: z.boolean({ error: 'Pilihan kunci nominal tidak terbaca. Pilih ulang dari daftar.' }).nullable().optional(),
    periode: z.enum(PERIODE_JENIS, { error: 'Periode tidak dikenali. Pilih ulang dari daftar.' }).nullable().optional(),
    menandaiMeninggal: z.boolean().nullable().optional(),
  })
  .refine((v) => !v.nominalDikunci || v.nominalBawaan != null, { message: 'Nominal belum diisi, jadi belum ada yang bisa dikunci.', path: ['nominalDikunci'] })
export type InputJenis = z.infer<typeof skemaJenis>

/** Ukuran maksimum foto bukti: 5 MB (docs/02 §5.1). */
export const BUKTI_MAKS_BYTE = 5 * 1024 * 1024
export const BUKTI_TIPE = ['image/jpeg', 'image/png', 'image/webp'] as const
