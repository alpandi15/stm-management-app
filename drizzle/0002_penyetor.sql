ALTER TABLE `anggota` ADD `pengutip` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transaksi` ADD `penyetor_anggota_id` integer REFERENCES anggota(id);--> statement-breakpoint
CREATE INDEX `idx_trx_penyetor` ON `transaksi` (`penyetor_anggota_id`);