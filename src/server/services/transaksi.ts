import 'server-only'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { db, sqlite } from '@/server/db'
import { anggota, jenis, transaksi, type Transaksi } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { nomorBuktiBerikutnya } from './nomor-bukti'
import { pastikanTidakTerkunci } from './penguncian'
import { catatLog } from './log'
import { hariIni, formatTanggal } from '@/lib/tanggal'
import type { InputCatatan } from '@/lib/validasi'

/**
 * Service penyimpanan catatan kas: satu-satunya jalur INSERT/UPDATE/soft-DELETE ke tabel
 * transaksi. Menjaga: arah disalin dari jenis (bukan dari form), nomor bukti dalam
 * transaksi SQLite, penguncian periode, log untuk setiap perubahan.
 */

export type HasilSimpan =
  | { perluKonfirmasi: true; mirip: Array<{ noBukti: string; keterangan: string }> }
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

  // Kemungkinan duplikat (docs/02 §5.2): tanggal + jenis + jumlah sama, belum dihapus
  const mirip = input.abaikanDuplikat
    ? []
    : db
        .select({ noBukti: transaksi.noBukti, keterangan: transaksi.keterangan, id: transaksi.id })
        .from(transaksi)
        .where(
          and(
            eq(transaksi.tanggal, input.tanggal),
            eq(transaksi.jenisId, input.jenisId),
            eq(transaksi.jumlah, input.jumlah),
            isNull(transaksi.dihapusPada),
            kecualiId ? ne(transaksi.id, kecualiId) : undefined,
          ),
        )
        .all()

  return { jenis: j, anggotaId, mirip }
}

export function buatCatatan(input: InputCatatan): HasilSimpan {
  pastikanTidakTerkunci(input.tanggal)
  const { jenis: j, anggotaId, mirip } = periksaIsi(input)
  if (mirip.length) return { perluKonfirmasi: true, mirip }

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
  const { jenis: j, anggotaId, mirip } = periksaIsi(input, id)
  if (mirip.length) return { perluKonfirmasi: true, mirip }

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
    return baris
  })()
}
