CREATE TABLE `rt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama` text NOT NULL,
	`keterangan` text,
	`urutan` integer DEFAULT 0 NOT NULL,
	`dibuat_pada` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rt_nama_unique` ON `rt` (`nama`);--> statement-breakpoint
ALTER TABLE `anggota` ADD `rt_id` integer REFERENCES rt(id);--> statement-breakpoint
CREATE INDEX `idx_anggota_rt` ON `anggota` (`rt_id`);