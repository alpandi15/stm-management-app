CREATE TABLE `kejadian_duka` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nomor` integer NOT NULL,
	`nama_almarhum` text NOT NULL,
	`hubungan` text,
	`anggota_id` integer,
	`anggota_keluarga_id` integer,
	`tanggal_meninggal` text NOT NULL,
	`tarif` integer NOT NULL,
	`keterangan` text,
	`dibuat_pada` integer NOT NULL,
	`diubah_pada` integer NOT NULL,
	FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`anggota_keluarga_id`) REFERENCES `anggota_keluarga`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_duka_tanggal` ON `kejadian_duka` (`tanggal_meninggal`);--> statement-breakpoint
CREATE TABLE `pembayaran_duka` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kejadian_id` integer NOT NULL,
	`anggota_id` integer NOT NULL,
	`tanggal_bayar` text NOT NULL,
	`catatan` text,
	`dibuat_pada` integer NOT NULL,
	FOREIGN KEY (`kejadian_id`) REFERENCES `kejadian_duka`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`anggota_id`) REFERENCES `anggota`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bayar_duka_unik` ON `pembayaran_duka` (`kejadian_id`,`anggota_id`);--> statement-breakpoint
CREATE INDEX `idx_bayar_duka_anggota` ON `pembayaran_duka` (`anggota_id`);--> statement-breakpoint
ALTER TABLE `anggota` ADD `tanggal_nonaktif` text;