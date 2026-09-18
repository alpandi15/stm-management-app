import { index, integer, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

// Aturan tipe (docs/02 §3.2):
// - uang           → INTEGER rupiah penuh, tanpa sen
// - tanggal        → TEXT 'YYYY-MM-DD'
// - waktu sistem   → INTEGER unix milidetik
// - boolean        → INTEGER 0/1 (mode: 'boolean')
// - JSON           → TEXT

export const ARAH = ['masuk', 'keluar'] as const
export type Arah = (typeof ARAH)[number]

export const METODE = ['tunai', 'transfer'] as const
export type Metode = (typeof METODE)[number]

export const AKSI_LOG = ['buat', 'ubah', 'hapus', 'kembalikan'] as const
export type AksiLog = (typeof AKSI_LOG)[number]

export const TEMA = ['sistem', 'terang', 'gelap'] as const
export type Tema = (typeof TEMA)[number]

/** Hidup atau sudah meninggal — TERPISAH dari `aktif` (masih beriuran). Spec 2 §A1. */
export const STATUS_HIDUP = ['aktif', 'meninggal'] as const
export type StatusHidup = (typeof STATUS_HIDUP)[number]

export const HUBUNGAN = ['Istri', 'Suami', 'Anak', 'Orang Tua', 'Mertua', 'Saudara', 'Lainnya'] as const
export type Hubungan = (typeof HUBUNGAN)[number]

/** Periode jenis uang (Spec 2 §B2): dipakai label dan deteksi duplikat. */
export const PERIODE_JENIS = ['bebas', 'sekali', 'bulanan', 'tahunan'] as const
export type PeriodeJenis = (typeof PERIODE_JENIS)[number]

/** Satu baris saja (id = 1): identitas STM, PIN, dan preferensi. */
export const pengaturan = sqliteTable('pengaturan', {
  id: integer('id').primaryKey(), // selalu 1
  namaStm: text('nama_stm').notNull(),
  alamat: text('alamat'),
  namaBendahara: text('nama_bendahara').notNull(),
  namaKetua: text('nama_ketua'),
  saldoAwal: integer('saldo_awal').notNull().default(0), // rupiah penuh
  tanggalMulai: text('tanggal_mulai').notNull(), // YYYY-MM-DD
  terkunciSampai: text('terkunci_sampai'), // YYYY-MM-DD, penguncian periode
  pinHash: text('pin_hash').notNull(),
  pemulihanHash: text('pemulihan_hash').notNull(),
  gagalLogin: integer('gagal_login').notNull().default(0),
  kunciSampai: integer('kunci_sampai'), // unix ms, jeda setelah salah PIN
  autoKunciMenit: integer('auto_kunci_menit').notNull().default(15),
  tema: text('tema', { enum: TEMA }).notNull().default('sistem'),
  dibuatPada: integer('dibuat_pada').notNull(),
  diubahPada: integer('diubah_pada').notNull(),
})

/** Jenis uang masuk/keluar ("Untuk Apa" di form, "Jenis" di laporan). */
export const jenis = sqliteTable('jenis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  arah: text('arah', { enum: ARAH }).notNull(),
  keterangan: text('keterangan'),
  urutan: integer('urutan').notNull().default(0),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  bawaan: integer('bawaan', { mode: 'boolean' }).notNull().default(false),
  // Spec 2 §A4: sakelar penanda meninggal — yang menentukan sakelarnya, bukan nama jenisnya
  menandaiMeninggal: integer('menandai_meninggal', { mode: 'boolean' }).notNull().default(false),
  // Spec 2 §B2: nominal ditetapkan pengurus; kosong = bendahara mengetik sendiri
  nominalBawaan: integer('nominal_bawaan'), // rupiah penuh
  nominalDikunci: integer('nominal_dikunci', { mode: 'boolean' }).notNull().default(false),
  periode: text('periode', { enum: PERIODE_JENIS }).notNull().default('bebas'),
})

export const anggota = sqliteTable(
  'anggota',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nomor: text('nomor'), // nomor anggota, mis. A-0001; unik bila terisi
    nama: text('nama').notNull(),
    noHp: text('no_hp'),
    alamat: text('alamat'),
    lat: real('lat'), // titik peta alamat (bukan uang — REAL boleh)
    lng: real('lng'),
    aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
    // Tim pengutip iuran: muncul paling atas di pilihan "Disetor oleh"
    pengutip: integer('pengutip', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: STATUS_HIDUP }).notNull().default('aktif'),
    tanggalMeninggal: text('tanggal_meninggal'), // YYYY-MM-DD
    ditandaiOlehTransaksiId: integer('ditandai_oleh_transaksi_id'), // tanpa FK (Spec 2 §A3)
    anggotaAsalId: integer('anggota_asal_id').references((): AnySQLiteColumn => anggota.id, { onDelete: 'set null' }), // pecah dari keluarga siapa
    tanggalBergabung: text('tanggal_bergabung'), // YYYY-MM-DD
    dibuatPada: integer('dibuat_pada').notNull(),
  },
  (t) => [uniqueIndex('idx_anggota_nomor').on(t.nomor), index('idx_anggota_penanda').on(t.ditandaiOlehTransaksiId)],
)

/** Tanggungan anggota (Spec 2 §A1). Soft delete: `pindahKeAnggotaId` terisi bila sudah jadi anggota sendiri. */
export const anggotaKeluarga = sqliteTable(
  'anggota_keluarga',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    anggotaId: integer('anggota_id')
      .notNull()
      .references(() => anggota.id, { onDelete: 'cascade' }),
    nama: text('nama').notNull(),
    hubungan: text('hubungan', { enum: HUBUNGAN }).notNull(),
    tanggalLahir: text('tanggal_lahir'),
    status: text('status', { enum: STATUS_HIDUP }).notNull().default('aktif'),
    tanggalMeninggal: text('tanggal_meninggal'),
    ditandaiOlehTransaksiId: integer('ditandai_oleh_transaksi_id'), // tanpa FK
    keterangan: text('keterangan'),
    pindahKeAnggotaId: integer('pindah_ke_anggota_id'), // Spec 2 §C1
    dihapusPada: integer('dihapus_pada'),
    dibuatPada: integer('dibuat_pada').notNull(),
    diubahPada: integer('diubah_pada').notNull(),
  },
  (t) => [index('idx_keluarga_anggota_status').on(t.anggotaId, t.status), index('idx_keluarga_penanda').on(t.ditandaiOlehTransaksiId)],
)

/** Catatan kas. Kolom `arah` sengaja menduplikasi `jenis.arah` (docs/02 §3.3). */
export const transaksi = sqliteTable(
  'transaksi',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    noBukti: text('no_bukti').notNull().unique(), // KM-2026-0001 / KK-2026-0001
    tanggal: text('tanggal').notNull(), // YYYY-MM-DD
    arah: text('arah', { enum: ARAH }).notNull(),
    jenisId: integer('jenis_id')
      .notNull()
      .references(() => jenis.id),
    anggotaId: integer('anggota_id').references(() => anggota.id),
    // Siapa yang meninggal (Spec 2 §A1): kosong = anggotanya sendiri
    anggotaKeluargaId: integer('anggota_keluarga_id').references(() => anggotaKeluarga.id, { onDelete: 'set null' }),
    // Siapa yang menyetor (masuk) / menyerahkan (keluar) uangnya; kosong = bendahara sendiri
    penyetorAnggotaId: integer('penyetor_anggota_id').references(() => anggota.id),
    // Periode yang dibayar untuk jenis bulanan ('2026-10') / tahunan ('2026'); null untuk jenis bebas/sekali.
    // Eksplisit, bukan diturunkan dari tanggal: tanggal setor bisa membayar bulan lain.
    periode: text('periode'),
    // Setoran kolektif yang membuat catatan ini (docs/04 sisipan setoran)
    setoranId: integer('setoran_id').references((): AnySQLiteColumn => setoran.id),
    namaPihak: text('nama_pihak'),
    keterangan: text('keterangan').notNull(),
    metode: text('metode', { enum: METODE }).notNull().default('tunai'),
    jumlah: integer('jumlah').notNull(), // rupiah penuh
    buktiFile: text('bukti_file'),
    dihapusPada: integer('dihapus_pada'), // soft delete, unix ms
    dibuatPada: integer('dibuat_pada').notNull(),
    diubahPada: integer('diubah_pada').notNull(),
  },
  (t) => [
    index('idx_trx_tanggal').on(t.tanggal),
    index('idx_trx_arah_tanggal').on(t.arah, t.tanggal),
    index('idx_trx_jenis').on(t.jenisId),
    index('idx_trx_penyetor').on(t.penyetorAnggotaId),
    index('idx_trx_periode').on(t.jenisId, t.anggotaId, t.periode),
    index('idx_trx_setoran').on(t.setoranId),
  ],
)

/** Setoran kolektif: satu kejadian pengutip menyetor iuran banyak anggota sekaligus. */
export const setoran = sqliteTable(
  'setoran',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nomor: text('nomor').notNull().unique(), // SI-2026-0001
    tanggal: text('tanggal').notNull(), // tanggal setor = tanggal semua catatannya
    // Jenis utama (informasi, untuk daftar): setoran boleh berisi banyak jenis
    jenisId: integer('jenis_id').references(() => jenis.id),
    periode: text('periode'), // periode awal jenis utama ('2026-10' / '2026'); null bila tanpa periode
    penyetorAnggotaId: integer('penyetor_anggota_id').references(() => anggota.id),
    keterangan: text('keterangan').notNull(),
    metode: text('metode', { enum: METODE }).notNull().default('tunai'),
    buktiFile: text('bukti_file'),
    dihapusPada: integer('dihapus_pada'),
    dibuatPada: integer('dibuat_pada').notNull(),
    diubahPada: integer('diubah_pada').notNull(),
  },
  (t) => [index('idx_setoran_tanggal').on(t.tanggal)],
)

/** Riwayat perubahan. Tanpa FK ke transaksi agar tetap ada setelah hapus permanen. */
export const log = sqliteTable(
  'log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transaksiId: integer('transaksi_id'),
    noBukti: text('no_bukti'),
    aksi: text('aksi', { enum: AKSI_LOG }).notNull(),
    dataLama: text('data_lama'), // JSON baris transaksi sebelum
    dataBaru: text('data_baru'), // JSON baris transaksi sesudah
    dibuatPada: integer('dibuat_pada').notNull(),
  },
  (t) => [index('idx_log_waktu').on(t.dibuatPada)],
)

export type Pengaturan = typeof pengaturan.$inferSelect
export type Jenis = typeof jenis.$inferSelect
export type Anggota = typeof anggota.$inferSelect
export type AnggotaKeluarga = typeof anggotaKeluarga.$inferSelect
export type Transaksi = typeof transaksi.$inferSelect
export type Log = typeof log.$inferSelect
export type Setoran = typeof setoran.$inferSelect
