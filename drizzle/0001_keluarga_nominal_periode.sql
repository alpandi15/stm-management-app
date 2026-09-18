CREATE TABLE `anggota_keluarga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anggota_id` integer NOT NULL,
	`nama` text NOT NULL,
	`hubungan` text NOT NULL,
	`tanggal_lahir` text,
	`status` text DEFAULT 'aktif' NOT NULL,
	`tanggal_meninggal` text,
	`ditandai_oleh_transaksi_id` integer,
	`keterangan` text,
	`pindah_ke_anggota_id` integer,
	`dihapus_pada` integer,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL,
	FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_keluarga_anggota_status` ON `anggota_keluarga` (`anggota_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_keluarga_penanda` ON `anggota_keluarga` (`ditandai_oleh_transaksi_id`);--> statement-breakpoint
ALTER TABLE `anggota` ADD `nomor` text;--> statement-breakpoint
ALTER TABLE `anggota` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `anggota` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `anggota` ADD `status` text DEFAULT 'aktif' NOT NULL;--> statement-breakpoint
ALTER TABLE `anggota` ADD `tanggal_meninggal` text;--> statement-breakpoint
ALTER TABLE `anggota` ADD `ditandai_oleh_transaksi_id` integer;--> statement-breakpoint
ALTER TABLE `anggota` ADD `anggota_asal_id` integer REFERENCES anggota(id);--> statement-breakpoint
ALTER TABLE `anggota` ADD `tanggal_bergabung` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_anggota_nomor` ON `anggota` (`nomor`);--> statement-breakpoint
CREATE INDEX `idx_anggota_penanda` ON `anggota` (`ditandai_oleh_transaksi_id`);--> statement-breakpoint
ALTER TABLE `jenis` ADD `menandai_meninggal` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jenis` ADD `nominal_bawaan` integer;--> statement-breakpoint
ALTER TABLE `jenis` ADD `nominal_dikunci` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `jenis` ADD `periode` text DEFAULT 'bebas' NOT NULL;--> statement-breakpoint
ALTER TABLE `transaksi` ADD `anggota_keluarga_id` integer REFERENCES anggota_keluarga(id);--> statement-breakpoint
-- Data untuk pemasangan yang sudah ada (Spec 2 §A4, §B3). Nominal tidak pernah disentuh migrasi/seed.
UPDATE `jenis` SET `periode` = 'bulanan' WHERE `kode` = 'PM01';--> statement-breakpoint
UPDATE `jenis` SET `periode` = 'sekali' WHERE `kode` IN ('PM03', 'PK01');--> statement-breakpoint
UPDATE `jenis` SET `menandai_meninggal` = 1 WHERE `kode` = 'PK01';
