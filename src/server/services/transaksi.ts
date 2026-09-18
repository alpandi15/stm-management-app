import 'server-only'
import { eq } from 'drizzle-orm'
import { db, sqlite } from '@/server/db'
import { anggota, jenis, transaksi, type Transaksi } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { nomorBuktiBerikutnya } from './nomor-bukti'
import { pastikanTidakTerkunci } from './penguncian'
import { catatLog } from './log'
import { cariDuplikat, periksaKeluargaMilik, periksaNominal, type CatatanMirip } from './aturan-catatan'
import * as penanda from './penanda-meninggal'
import { hariIni, formatTanggal } from '@/lib/tanggal'
import type { InputCatatan } from '@/lib/validasi'

/**
 * Service penyimpanan catatan kas: satu-satunya jalur INSERT/UPDATE/soft-DELETE ke tabel
 * transaksi. Menjaga: arah disalin dari jenis (bukan dari form), nomor bukti dalam
 * transaksi SQLite, penguncian periode, log untuk setiap perubahan.
 */

export type HasilSimpan =
  | { perluKonfirmasi: true; mirip: CatatanMirip[]; kalimat: string }
  | { perluKonfirmasi: false; catatan: Transaksi }

function ambilTransaksi(id: number): Transaksi | null {
  return db.select().from(transaksi).where(eq(transaksi.id, id)).get() ?? null
}

/** Validasi lintas-tabel yang tidak bisa dilakukan Zod (docs/02 §5.1). */
function periksaIsi(input: InputCatatan, kecualiId?: number) {
  const p = ambilPengaturan()
  if (!p) throw new GalatPengguna('Pengaturan awal belum dilakukan.')

  if (input.tanggal > hariIni()) throw new GalatPengguna('Tanggal tidak boleh melewati hari ini.', 'tanggal')
  if (input.tanggal < p.tanggalMulai) {
    throw new GalatPengguna(
      `Tanggal sebelum ${formatTanggal(p.tanggalMulai)} (mulai pembukuan) tidak bisa dicatat. Ubah tanggal mulai di Pengaturan bila perlu.`,
      'tanggal',
    )
  }

  const j = db.select().from(jenis).where(eq(jenis.id, input.jenisId)).get()
  // Kecocokan jenis ↔ arah WAJIB diperiksa di server: dropdown di klien tidak bisa dipercaya
  if (!j || !j.aktif || j.arah !== input.arah) {
    throw new GalatPengguna('Pilihan tidak sesuai. Pilih ulang dari daftar.', 'jenisId')
  }

  let anggotaId: number | null = null
  if (input.anggotaId) {
    const a = db.select({ id: anggota.id }).from(anggota).where(eq(anggota.id, input.anggotaId)).get()
    if (!a) throw new GalatPengguna('Anggota tidak ditemukan. Pilih ulang atau ketik namanya.', 'anggotaId')
    anggotaId = a.id
  }

  // Tanggungan hanya bermakna pada jenis penanda dan harus milik anggota yang dipilih (Spec 2 §A6)
  const anggotaKeluargaId = j.menandaiMeninggal ? periksaKeluargaMilik(db, input.anggotaKeluargaId, anggotaId) : null

  // Nominal terkunci ditegakkan di server (Spec 2 §B4)
  periksaNominal(j, input.jumlah)

  // Kemungkinan duplikat (docs/02 §5.2 + Spec 2 §B4): per periode bila anggota terisi
  const duplikat = input.abaikanDuplikat ? null : cariDuplikat(db, { ...input, anggotaId, namaPihak: input.namaPihak }, j, kecualiId)

  return { jenis: j, anggotaId, anggotaKeluargaId, duplikat }
}

export function buatCatatan(input: InputCatatan): HasilSimpan {
  pastikanTidakTerkunci(input.tanggal)
  const { jenis: j, anggotaId, anggotaKeluargaId, duplikat } = periksaIsi(input)
  if (duplikat) return { perluKonfirmasi: true, ...duplikat }

  const sekarang = Date.now()
  const tahun = Number(input.tanggal.slice(0, 4))

  const catatan = sqlite.transaction(() => {
    const noBukti = nomorBuktiBerikutnya(db, j.arah, tahun)
    const baris = db
      .insert(transaksi)
      .values({
        noBukti,
        tanggal: input.tanggal,
        arah: j.arah, // disalin dari jenis, bukan dari form
        jenisId: j.id,
        anggotaId,
        anggotaKeluargaId,
        namaPihak: input.namaPihak?.trim() || null,
        keterangan: input.keterangan.trim(),
        metode: input.metode,
        jumlah: input.jumlah,
        buktiFile: input.buktiFile ?? null,
        dibuatPada: sekarang,
        diubahPada: sekarang,
      })
      .returning()
      .get()
    catatLog(db, 'buat', null, baris)
    penanda.terapkan(db, baris)
    return baris
  })()

  return { perluKonfirmasi: false, catatan }
}

export function ubahCatatan(id: number, input: InputCatatan): HasilSimpan {
  const lama = ambilTransaksi(id)
  if (!lama || lama.dihapusPada) throw new GalatPengguna('Catatan tidak ditemukan. Mungkin sudah dihapus.')

  // Tanggal lama DAN baru sama-sama harus di luar periode terkunci
  pastikanTidakTerkunci(lama.tanggal)
  pastikanTidakTerkunci(input.tanggal)
  const { jenis: j, anggotaId, anggotaKeluargaId, duplikat } = periksaIsi(input, id)
  if (duplikat) return { perluKonfirmasi: true, ...duplikat }

  // Nomor bukti tidak berubah walau arah/tahun berubah: nomornya sudah tertulis di kuitansi.
  // Tapi arah harus tetap konsisten dengan jenis — bila arah berubah, tolak: itu bukan
  // "ubah", melainkan catatan yang salah kaprah dan lebih jujur dihapus lalu dibuat baru.
  if (j.arah !== lama.arah) {
    throw new GalatPengguna(
      'Uang Masuk tidak bisa diubah menjadi Uang Keluar (atau sebaliknya) karena nomor buktinya sudah terbit. Hapus catatan ini lalu buat yang baru.',
      'arah',
    )
  }

  const baru = sqlite.transaction(() => {
    const baris = db
      .update(transaksi)
      .set({
        tanggal: input.tanggal,
        jenisId: j.id,
        anggotaId,
        anggotaKeluargaId,
        namaPihak: input.namaPihak?.trim() || null,
        keterangan: input.keterangan.trim(),
        metode: input.metode,
        jumlah: input.jumlah,
        buktiFile: input.buktiFile === undefined ? lama.buktiFile : input.buktiFile,
        diubahPada: Date.now(),
      })
      .where(eq(transaksi.id, id))
      .returning()
      .get()
    catatLog(db, 'ubah', lama, baris)
    penanda.segarkan(db, baris) // sasaran lama bebas, sasaran baru ditandai (Spec 2 §A3)
    return baris
  })()

  return { perluKonfirmasi: false, catatan: baru }
}

/** Hapus lunak (docs/02 §5.4): mengisi dihapusPada, baris tetap ada, bisa dikembalikan. */
export function hapusCatatan(id: number): Transaksi {
  const lama = ambilTransaksi(id)
  if (!lama || lama.dihapusPada) throw new GalatPengguna('Catatan tidak ditemukan. Mungkin sudah dihapus.')
  pastikanTidakTerkunci(lama.tanggal)

  return sqlite.transaction(() => {
    const baris = db
      .update(transaksi)
      .set({ dihapusPada: Date.now(), diubahPada: Date.now() })
      .where(eq(transaksi.id, id))
      .returning()
      .get()
    catatLog(db, 'hapus', lama, baris)
    penanda.batalkan(db, id) // mengembalikan status seperti sebelum santunan dicatat
    return baris
  })()
}

export function kembalikanCatatan(id: number): Transaksi {
  const lama = ambilTransaksi(id)
  if (!lama) throw new GalatPengguna('Catatan tidak ditemukan.')
  if (!lama.dihapusPada) throw new GalatPengguna('Catatan ini tidak dalam keadaan terhapus.')
  pastikanTidakTerkunci(lama.tanggal)

  return sqlite.transaction(() => {
    const baris = db
      .update(transaksi)
      .set({ dihapusPada: null, diubahPada: Date.now() })
      .where(eq(transaksi.id, id))
      .returning()
      .get()
    catatLog(db, 'kembalikan', lama, baris)
    penanda.terapkan(db, baris) // memulihkan menandai ulang
    return baris
  })()
}
