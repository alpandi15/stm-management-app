// Murni: menerima Db, tanpa koneksi global — supaya bisa diuji dengan SQLite in-memory.
import { like, sql } from 'drizzle-orm'
import type { Db } from '@/server/db'
import { transaksi, type Arah } from '@/server/db/schema'

/**
 * Nomor bukti KM-2026-0001 / KK-2026-0001, urut per arah per tahun (docs/02 §5.3).
 * HARUS dipanggil di dalam sqlite.transaction() bersama INSERT-nya, supaya tidak ada
 * nomor kembar. Memperhitungkan catatan yang sudah dihapus (tidak memfilter dihapusPada):
 * nomor yang pernah dipakai sudah tertulis di kuitansi fisik dan tidak boleh dipakai ulang.
 *
 * Urutan diambil sebagai ANGKA (cast), bukan max() teks: setelah 9999, "10000" < "9999"
 * secara teks dan nomor akan kembar.
 */
export function nomorBuktiBerikutnya(tx: Db, arah: Arah, tahun: number): string {
  const awalan = `${arah === 'masuk' ? 'KM' : 'KK'}-${tahun}-`
  const terakhir = tx
    .select({ n: sql<number | null>`max(cast(substr(${transaksi.noBukti}, ${awalan.length + 1}) as integer))` })
    .from(transaksi)
    .where(like(transaksi.noBukti, `${awalan}%`))
    .get()
  const urut = (terakhir?.n ?? 0) + 1
  return `${awalan}${String(urut).padStart(4, '0')}`
}
