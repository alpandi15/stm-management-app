CREATE TABLE `tunggakan_duka_lama` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`anggota_id` integer NOT NULL,
	`jumlah` integer NOT NULL,
	`tarif` integer NOT NULL,
	`keterangan` text,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL,
	FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tunggakan_lama_anggota` ON `tunggakan_duka_lama` (`anggota_id`);--> statement-breakpoint
INSERT INTO `tunggakan_duka_lama` (`anggota_id`, `jumlah`, `tarif`, `keterangan`, `dibuat_pada`, `diubah_pada`)
SELECT `id`, `duka_lama_jumlah`, `duka_lama_rupiah` / `duka_lama_jumlah`, `duka_lama_keterangan`, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000
FROM `anggota` WHERE `duka_lama_jumlah` > 0;--> statement-breakpoint
ALTER TABLE `anggota` DROP COLUMN `duka_lama_jumlah`;--> statement-breakpoint
ALTER TABLE `anggota` DROP COLUMN `duka_lama_rupiah`;--> statement-breakpoint
ALTER TABLE `anggota` DROP COLUMN `duka_lama_keterangan`;