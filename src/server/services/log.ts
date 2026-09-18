import 'server-only'
import type { Db } from '@/server/db'
import { log, type AksiLog, type Transaksi } from '@/server/db/schema'

/**
 * Menulis riwayat perubahan (docs/02 §5.7). Dipanggil dari service penyimpanan —
 * bukan dari Server Action — supaya setiap jalur penulisan tercatat.
 * dataLama/dataBaru adalah JSON utuh baris transaksi; perbandingan field dihitung
 * saat menampilkan (queries/riwayat.ts), bukan saat menyimpan.
 */
export function catatLog(
  tx: Db,
  aksi: AksiLog,
  lama: Transaksi | null,
  baru: Transaksi | null,
): void {
  const acuan = baru ?? lama
  tx.insert(log)
    .values({
      transaksiId: acuan?.id ?? null,
      noBukti: acuan?.noBukti ?? null,
      aksi,
      dataLama: lama ? JSON.stringify(lama) : null,
      dataBaru: baru ? JSON.stringify(baru) : null,
      dibuatPada: Date.now(),
    })
    .run()
}
