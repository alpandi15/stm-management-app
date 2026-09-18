import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
})

export const anggota = sqliteTable('anggota', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nama: text('nama').notNull(),
  noHp: text('no_hp'),
  alamat: text('alamat'),
  aktif: integer('aktif', { mode: 'boolean' }).notNull().default(true),
  dibuatPada: integer('dibuat_pada').notNull(),
})

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
  ],
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
export type Transaksi = typeof transaksi.$inferSelect
export type Log = typeof log.$inferSelect
