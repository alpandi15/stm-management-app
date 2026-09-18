PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_setoran` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nomor` text NOT NULL,
	`tanggal` text NOT NULL,
	`jenis_id` integer,
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
INSERT INTO `__new_setoran`("id", "nomor", "tanggal", "jenis_id", "periode", "penyetor_anggota_id", "keterangan", "metode", "bukti_file", "dihapus_pada", "dibuat_pada", "diubah_pada") SELECT "id", "nomor", "tanggal", "jenis_id", "periode", "penyetor_anggota_id", "keterangan", "metode", "bukti_file", "dihapus_pada", "dibuat_pada", "diubah_pada" FROM `setoran`;--> statement-breakpoint
DROP TABLE `setoran`;--> statement-breakpoint
ALTER TABLE `__new_setoran` RENAME TO `setoran`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `setoran_nomor_unique` ON `setoran` (`nomor`);--> statement-breakpoint
CREATE INDEX `idx_setoran_tanggal` ON `setoran` (`tanggal`);