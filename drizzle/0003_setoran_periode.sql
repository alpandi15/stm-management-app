CREATE TABLE `setoran` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nomor` text NOT NULL,
	`tanggal` text NOT NULL,
	`jenis_id` integer NOT NULL,
	`periode` text,
	`penyetor_anggota_id` integer,
	`keterangan` text NOT NULL,
	`metode` text DEFAULT 'tunai' NOT NULL,
	`bukti_file` text,
	`dihapus_pada` integer,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL,
	FOREIGN KEY (`jenis_id`) REFERENCES `jenis`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`penyetor_anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setoran_nomor_unique` ON `setoran` (`nomor`);--> statement-breakpoint
CREATE INDEX `idx_setoran_tanggal` ON `setoran` (`tanggal`);--> statement-breakpoint
ALTER TABLE `transaksi` ADD `periode` text;--> statement-breakpoint
ALTER TABLE `transaksi` ADD `setoran_id` integer REFERENCES setoran(id);--> statement-breakpoint
CREATE INDEX `idx_trx_periode` ON `transaksi` (`jenis_id`,`anggota_id`,`periode`);--> statement-breakpoint
CREATE INDEX `idx_trx_setoran` ON `transaksi` (`setoran_id`);--> statement-breakpoint
-- Periode untuk catatan lama: diturunkan dari tanggal sesuai periode jenisnya
UPDATE `transaksi` SET `periode` = substr(`tanggal`, 1, 7) WHERE `periode` IS NULL AND `jenis_id` IN (SELECT `id` FROM `jenis` WHERE `periode` = 'bulanan');--> statement-breakpoint
UPDATE `transaksi` SET `periode` = substr(`tanggal`, 1, 4) WHERE `periode` IS NULL AND `jenis_id` IN (SELECT `id` FROM `jenis` WHERE `periode` = 'tahunan');
