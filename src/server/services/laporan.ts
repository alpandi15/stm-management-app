import 'server-only'
import { and, eq, isNull, sql, sum } from 'drizzle-orm'
import { db } from '@/server/db'
import { transaksi } from '@/server/db/schema'
import { ambilPengaturan } from '@/server/queries/pengaturan'

// Satu-satunya tempat rumus keuangan hidup (docs/02 §6). Beranda, Laporan, Catatan Kas,
// dan dokumen cetak semuanya memanggil fungsi di sini. Semua penjumlahan lewat agregat SQL.
// Fase 4 baru membawa sisa kas; ringkasan periode dan rincian per jenis menyusul di Fase 6.

/** Σ jumlah per arah untuk catatan yang belum dihapus, opsional dibatasi tanggal < batas. */
function totalArah(arah: 'masuk' | 'keluar', sebelumTanggal?: string): number {
  const r = db
    .select({ total: sum(transaksi.jumlah) })
    .from(transaksi)
    .where(
      and(
        eq(transaksi.arah, arah),
        isNull(transaksi.dihapusPada),
        sebelumTanggal ? sql`${transaksi.tanggal} < ${sebelumTanggal}` : undefined,
      ),
    )
    .get()
  return Number(r?.total ?? 0)
}

/** Sisa uang kas saat ini = saldo awal + Σ masuk − Σ keluar (semua catatan belum dihapus). */
export function hitungSisaKas(): number {
  const saldoAwal = ambilPengaturan()?.saldoAwal ?? 0
  return saldoAwal + totalArah('masuk') - totalArah('keluar')
}
