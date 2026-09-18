// Aturan catatan yang bergantung pada jenis (Spec 2 §A6, §B4) — murni, menerima Db.
import { and, eq, isNull, like, ne, type SQL } from 'drizzle-orm'
import type { Db } from '@/server/db'
import { anggotaKeluarga, transaksi, type Jenis } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { formatRupiah } from '@/lib/rupiah'
import { formatBulan, formatTanggal } from '@/lib/tanggal'

export type CatatanMirip = { noBukti: string; keterangan: string; tanggal: string }

export type HasilDuplikat = { mirip: CatatanMirip[]; kalimat: string }

/**
 * Deteksi duplikat memakai periode jenis (Spec 2 §B4). Hanya berlaku bila anggota terisi;
 * nama lepas memakai aturan lama (tanggal + jenis + jumlah sama). Tetap dialog, bukan penolakan.
 */
export function cariDuplikat(
  db: Db,
  input: { tanggal: string; jenisId: number; jumlah: number; anggotaId: number | null; namaPihak?: string | null },
  j: Pick<Jenis, 'nama' | 'periode'>,
  kecualiId?: number,
): HasilDuplikat | null {
  const dasar: SQL[] = [eq(transaksi.jenisId, input.jenisId), isNull(transaksi.dihapusPada)]
  if (kecualiId) dasar.push(ne(transaksi.id, kecualiId))

  let kondisi: SQL | undefined
  let kalimat = ''
  const nama = input.namaPihak ?? 'Anggota ini'
  if (input.anggotaId && j.periode !== 'bebas') {
    dasar.push(eq(transaksi.anggotaId, input.anggotaId))
    if (j.periode === 'bulanan') {
      kondisi = and(...dasar, like(transaksi.tanggal, `${input.tanggal.slice(0, 7)}-%`))
      kalimat = `Sepertinya ${nama} sudah membayar ${j.nama} untuk ${formatBulan(input.tanggal)}`
    } else if (j.periode === 'tahunan') {
      kondisi = and(...dasar, like(transaksi.tanggal, `${input.tanggal.slice(0, 4)}-%`))
      kalimat = `Sepertinya ${nama} sudah membayar ${j.nama} untuk tahun ${input.tanggal.slice(0, 4)}`
    } else {
      kondisi = and(...dasar)
      kalimat = `${nama} sudah pernah membayar ${j.nama}`
    }
  } else {
    kondisi = and(...dasar, eq(transaksi.tanggal, input.tanggal), eq(transaksi.jumlah, input.jumlah))
    kalimat = 'Ada catatan lain dengan tanggal, jenis, dan jumlah yang sama persis'
  }

  const mirip = db
    .select({ noBukti: transaksi.noBukti, keterangan: transaksi.keterangan, tanggal: transaksi.tanggal })
    .from(transaksi)
    .where(kondisi)
    .all()
  if (mirip.length === 0) return null

  const pertama = mirip[0]
  if (input.anggotaId && j.periode === 'sekali') {
    kalimat += ` pada ${formatTanggal(pertama.tanggal)} (${pertama.noBukti}). ${j.nama.toLowerCase().includes('pangkal') ? 'Uang pangkal biasanya hanya sekali.' : 'Jenis ini biasanya hanya sekali.'} Tetap simpan?`
  } else if (input.anggotaId && j.periode !== 'bebas') {
    kalimat += ` (nomor bukti ${pertama.noBukti}). Tetap simpan?`
  } else {
    kalimat += '. Kalau memang dua kejadian berbeda, lanjutkan saja.'
  }
  return { mirip, kalimat }
}

/** Kunci nominal (Spec 2 §B4): ditegakkan di server — form readOnly hanya menyembunyikan aksi. */
export function periksaNominal(j: Pick<Jenis, 'nama' | 'nominalBawaan' | 'nominalDikunci'>, jumlah: number): void {
  if (j.nominalDikunci && j.nominalBawaan != null && jumlah !== j.nominalBawaan) {
    throw new GalatPengguna(
      `Jumlah untuk ${j.nama} sudah ditetapkan ${formatRupiah(j.nominalBawaan)}. Bila angkanya memang berubah, ubah dulu di Pengaturan › Jenis Uang.`,
      'jumlah',
    )
  }
}

/** Tanggungan harus milik anggota yang dipilih (Spec 2 §A6) — id yang dikarang bisa menandai orang lain meninggal. */
export function periksaKeluargaMilik(db: Db, anggotaKeluargaId: number | null | undefined, anggotaId: number | null): number | null {
  if (!anggotaKeluargaId) return null
  const k = db
    .select({ id: anggotaKeluarga.id, anggotaId: anggotaKeluarga.anggotaId })
    .from(anggotaKeluarga)
    .where(and(eq(anggotaKeluarga.id, anggotaKeluargaId), isNull(anggotaKeluarga.dihapusPada)))
    .get()
  if (!k) throw new GalatPengguna('Anggota keluarga yang dipilih tidak dikenali. Pilih ulang dari daftar.', 'anggotaKeluargaId')
  if (!anggotaId || k.anggotaId !== anggotaId) {
    throw new GalatPengguna('Anggota keluarga itu bukan tanggungan nama yang dipilih. Pilih ulang dari daftar.', 'anggotaKeluargaId')
  }
  return k.id
}
