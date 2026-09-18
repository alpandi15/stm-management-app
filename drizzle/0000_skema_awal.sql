CREATE TABLE `anggota` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`no_hp` text,
	`alamat` text,
	`aktif` integer DEFAULT true NOT NULL,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jenis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kode` text NOT NULL,
	`nama` text NOT NULL,
	`arah` text NOT NULL,
	`keterangan` text,
	`urutan` integer DEFAULT 0 NOT NULL,
	`aktif` integer DEFAULT true NOT NULL,
	`bawaan` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jenis_kode_unique` ON `jenis` (`kode`);--> statement-breakpoint
CREATE TABLE `log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaksi_id` integer,
	`no_bukti` text,
	`aksi` text NOT NULL,
	`data_lama` text,
	`data_baru` text,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_log_waktu` ON `log` (`dibuat_pada`);--> statement-breakpoint
CREATE TABLE `pengaturan` (
	`id` integer PRIMARY KEY NOT NULL,
	`nama_stm` text NOT NULL,
	`alamat` text,
	`nama_bendahara` text NOT NULL,
	`nama_ketua` text,
	`saldo_awal` integer DEFAULT 0 NOT NULL,
	`tanggal_mulai` text NOT NULL,
	`terkunci_sampai` text,
	`pin_hash` text NOT NULL,
	`pemulihan_hash` text NOT NULL,
	`gagal_login` integer DEFAULT 0 NOT NULL,
	`kunci_sampai` integer,
	`auto_kunci_menit` integer DEFAULT 15 NOT NULL,
	`tema` text DEFAULT 'sistem' NOT NULL,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaksi` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`no_bukti` text NOT NULL,
	`tanggal` text NOT NULL,
	`arah` text NOT NULL,
	`jenis_id` integer NOT NULL,
	`anggota_id` integer,
	`nama_pihak` text,
	`keterangan` text NOT NULL,
	`metode` text DEFAULT 'tunai' NOT NULL,
	`jumlah` integer NOT NULL,
	`bukti_file` text,
	`dihapus_pada` integer,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL,
	FOREIGN KEY (`jenis_id`) REFERENCES `jenis`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaksi_no_bukti_unique` ON `transaksi` (`no_bukti`);--> statement-breakpoint
CREATE INDEX `idx_trx_tanggal` ON `transaksi` (`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_trx_arah_tanggal` ON `transaksi` (`arah`,`tanggal`);--> statement-breakpoint
CREATE INDEX `idx_trx_jenis` ON `transaksi` (`jenis_id`);