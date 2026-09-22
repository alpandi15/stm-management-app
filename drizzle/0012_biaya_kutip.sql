ALTER TABLE `jenis` ADD `biaya_kutip_persen` integer;--> statement-breakpoint
ALTER TABLE `jenis` ADD `biaya_kutip_jenis_id` integer;--> statement-breakpoint
ALTER TABLE `transaksi` ADD `otomatis` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transaksi` ADD `induk_id` integer;--> statement-breakpoint
CREATE INDEX `idx_trx_induk` ON `transaksi` (`induk_id`);