// Penandaan meninggal otomatis (Spec 2 §A3). Satu-satunya tempat aturan ini hidup.
// Murni: menerima Db, dipanggil dari service penyimpanan (bukan Server Action) supaya
// setiap jalur penulisan — buat, ubah, hapus, kembalikan — tetap ditangani.
import { and, eq, isNull } from 'drizzle-orm'
import type { Db } from '@/server/db'
import { anggota, anggotaKeluarga, jenis, type Transaksi } from '@/server/db/schema'

function jenisMenandai(db: Db, jenisId: number): boolean {
  return db.select({ m: jenis.menandaiMeninggal }).from(jenis).where(eq(jenis.id, jenisId)).get()?.m === true
}

/**
 * Sasaran ditentukan dari catatan: keluarga bila `anggotaKeluargaId` terisi, anggotanya
 * sendiri bila hanya `anggotaId`, tidak ada bila nama diketik lepas.
 * Sasaran yang SUDAH meninggal tidak disentuh — penandanya tidak diambil alih.
 */
export function terapkan(db: Db, t: Pick<Transaksi, 'id' | 'jenisId' | 'anggotaId' | 'anggotaKeluargaId' | 'tanggal'>): void {
  if (!jenisMenandai(db, t.jenisId)) return
  if (t.anggotaKeluargaId) {
    db.update(anggotaKeluarga)
      .set({ status: 'meninggal', tanggalMeninggal: t.tanggal, ditandaiOlehTransaksiId: t.id, diubahPada: Date.now() })
      .where(and(eq(anggotaKeluarga.id, t.anggotaKeluargaId), eq(anggotaKeluarga.status, 'aktif'), isNull(anggotaKeluarga.dihapusPada)))
      .run()
  } else if (t.anggotaId) {
    db.update(anggota)
      .set({ status: 'meninggal', tanggalMeninggal: t.tanggal, ditandaiOlehTransaksiId: t.id })
      .where(and(eq(anggota.id, t.anggotaId), eq(anggota.status, 'aktif')))
      .run()
  }
}

/**
 * Mencabut penandaan yang dibuat catatan ini — dicari lewat `ditandaiOlehTransaksiId`,
 * BUKAN dari sasaran catatan saat ini (pada perubahan, sasarannya bisa sudah dipindah).
 * Status yang diisi manual (penanda kosong) tidak pernah tersentuh.
 */
export function batalkan(db: Db, transaksiId: number): void {
  db.update(anggota)
    .set({ status: 'aktif', tanggalMeninggal: null, ditandaiOlehTransaksiId: null })
    .where(eq(anggota.ditandaiOlehTransaksiId, transaksiId))
    .run()
  db.update(anggotaKeluarga)
    .set({ status: 'aktif', tanggalMeninggal: null, ditandaiOlehTransaksiId: null, diubahPada: Date.now() })
    .where(eq(anggotaKeluarga.ditandaiOlehTransaksiId, transaksiId))
    .run()
}

/** Pada perubahan: batalkan lalu terapkan — sasaran lama bebas, sasaran baru ditandai. */
export function segarkan(db: Db, t: Pick<Transaksi, 'id' | 'jenisId' | 'anggotaId' | 'anggotaKeluargaId' | 'tanggal'>): void {
  batalkan(db, t.id)
  terapkan(db, t)
}
