import 'server-only'
import { GalatPengguna } from '@/server/galat'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { formatTanggal, type TanggalISO } from '@/lib/tanggal'

/**
 * Penguncian periode (docs/02 §5.5): bila `terkunciSampai` terisi, catatan bertanggal
 * ≤ nilai itu tidak bisa dibuat, diubah, atau dihapus. Satu tempat, dipanggil dari
 * semua jalur penulisan. Pengguna boleh membuka penguncian sendiri di Pengaturan.
 */
export function pastikanTidakTerkunci(tanggal: TanggalISO): void {
  const p = ambilPengaturan()
  const batas = p?.terkunciSampai
  if (batas && tanggal <= batas) {
    throw new GalatPengguna(
      `Pembukuan sampai ${formatTanggal(batas)} sudah ditutup. Buka dulu penguncian di Pengaturan bila memang perlu diperbaiki.`,
      'tanggal',
    )
  }
}
