import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db, sqlite } from '@/server/db'
import { anggota, jenis, transaksi, type Transaksi } from '@/server/db/schema'
import { GalatPengguna } from '@/server/galat'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { nomorBuktiBerikutnya } from './nomor-bukti'
import { pastikanTidakTerkunci } from './penguncian'
import { catatLog } from './log'
import { cariDuplikat, periksaKeluargaMilik, periksaNominal, type CatatanMirip } from './aturan-catatan'
import * as penanda from './penanda-meninggal'
import { hariIni, formatTanggal, periodeUntuk } from '@/lib/tanggal'
import type { InputCatatan } from '@/lib/validasi'
import { adaBiayaKutip, hitungBiayaKutip } from '@/lib/biaya-kutip'

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

/** Catatan otomatis mengikuti induknya; menyentuhnya langsung ditolak dengan arahan ke induk. */
function tolakBilaOtomatis(t: Transaksi): void {
  if (t.otomatis) {
    throw new GalatPengguna('Catatan ini dibuat otomatis (biaya kutip) dan mengikuti catatan uang masuknya. Ubah atau hapus catatan uang masuk itu, biaya kutipnya ikut menyesuaikan.')
  }
}

/** Jenis uang keluar untuk biaya kutip: pilihan di jenis, atau bawaan PK11. */
function jenisBiayaKutip(j: { biayaKutipJenisId: number | null }) {
  const pilihan = j.biayaKutipJenisId ? db.select().from(jenis).where(eq(jenis.id, j.biayaKutipJenisId)).get() : null
  const k = pilihan && pilihan.arah === 'keluar' && pilihan.aktif ? pilihan : db.select().from(jenis).where(eq(jenis.kode, 'PK11')).get()
  if (!k) throw new GalatPengguna('Jenis uang keluar untuk biaya kutip tidak ditemukan. Periksa Pengaturan › Jenis Uang.')
  return k
}

/** Anak biaya kutip yang masih hidup dari satu catatan induk. */
function anakBiayaKutip(indukId: number): Transaksi | null {
  return db.select().from(transaksi).where(and(eq(transaksi.indukId, indukId), isNull(transaksi.dihapusPada))).get() ?? null
}

/**
 * Menyelaraskan catatan biaya kutip dengan induknya (docs/02 §5.1f). Dipanggil di dalam
 * transaksi SQLite setelah induk dibuat/diubah. Uang masuk tetap bruto; anak = persen × bruto.
 * `aktif` false = pengguna mematikan biaya kutip untuk catatan ini → anak yang ada dihapus lunak.
 */
function selaraskanBiayaKutip(induk: Transaksi, j: { arah: string; biayaKutipPersen: number | null; biayaKutipJenisId: number | null }, aktif: boolean): void {
  const ada = anakBiayaKutip(induk.id)
  const perlu = aktif && adaBiayaKutip(j) && !induk.dihapusPada
  const jumlah = perlu ? hitungBiayaKutip(induk.jumlah, j.biayaKutipPersen) : 0
  if (!perlu || jumlah <= 0) {
    if (ada) {
      const baris = db.update(transaksi).set({ dihapusPada: Date.now(), diubahPada: Date.now() }).where(eq(transaksi.id, ada.id)).returning().get()
      catatLog(db, 'hapus', ada, baris)
    }
    return
  }
  const k = jenisBiayaKutip(j)
  const namaPengutip = induk.penyetorAnggotaId ? (db.select({ nama: anggota.nama }).from(anggota).where(eq(anggota.id, induk.penyetorAnggotaId)).get()?.nama ?? null) : null
  const nilai = {
    tanggal: induk.tanggal,
    jenisId: k.id,
    penyetorAnggotaId: induk.penyetorAnggotaId,
    namaPihak: namaPengutip ?? 'Pengutip',
    keterangan: `Biaya kutip ${j.biayaKutipPersen}% — ${induk.noBukti}`,
    metode: induk.metode,
    jumlah,
    diubahPada: Date.now(),
  }
  if (ada) {
    const baris = db.update(transaksi).set(nilai).where(eq(transaksi.id, ada.id)).returning().get()
    catatLog(db, 'ubah', ada, baris)
    return
  }
  const noBukti = nomorBuktiBerikutnya(db, 'keluar', Number(induk.tanggal.slice(0, 4)))
  const baris = db
    .insert(transaksi)
    .values({ ...nilai, noBukti, arah: 'keluar', otomatis: true, indukId: induk.id, setoranId: induk.setoranId, dibuatPada: Date.now() })
    .returning()
    .get()
  catatLog(db, 'buat', null, baris)
}

/** Untuk form: pratinjau biaya kutip sebuah jenis (0 bila tidak ada). */
export function pratinjauBiayaKutip(jenisId: number, jumlah: number): { persen: number; jumlah: number } {
  const j = db.select({ arah: jenis.arah, biayaKutipPersen: jenis.biayaKutipPersen }).from(jenis).where(eq(jenis.id, jenisId)).get()
  if (!j || !adaBiayaKutip(j)) return { persen: 0, jumlah: 0 }
  return { persen: j.biayaKutipPersen!, jumlah: hitungBiayaKutip(jumlah, j.biayaKutipPersen) }
}

/** Validasi lintas-tabel yang tidak bisa dilakukan Zod (docs/02 §5.1). `kelipatan` > 1 = catatan gabungan (nominal × n). */
function periksaIsi(input: InputCatatan, kecualiId?: number, kelipatan = 1) {
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

  // Penyetor: anggota terdaftar; kosong = bendahara sendiri
  let penyetorAnggotaId: number | null = null
  if (input.penyetorAnggotaId) {
    const p = db.select({ id: anggota.id }).from(anggota).where(eq(anggota.id, input.penyetorAnggotaId)).get()
    if (!p) throw new GalatPengguna('Penyetor yang dipilih tidak dikenali. Pilih ulang dari daftar.', 'penyetorAnggotaId')
    penyetorAnggotaId = p.id
  }

  // Nominal terkunci ditegakkan di server (Spec 2 §B4) — per satuan bila catatan gabungan.
  // Catatan tanpa nama anggota/pihak dianggap uang gabungan: boleh kelipatan nominal.
  if (kelipatan > 1 && input.jumlah % kelipatan !== 0) throw new GalatPengguna('Jumlah gabungan tidak habis dibagi kelipatannya.', 'jumlah')
  const tanpaNama = !anggotaId && !input.namaPihak?.trim()
  periksaNominal(j, input.jumlah / kelipatan, kelipatan === 1 && tanpaNama)

  // Kemungkinan duplikat (docs/02 §5.2 + Spec 2 §B4): per periode bila anggota terisi
  const periode = periodeUntuk(j.periode, input.tanggal, input.periode)
  const duplikat = input.abaikanDuplikat ? null : cariDuplikat(db, { ...input, anggotaId, namaPihak: input.namaPihak, periode }, j, kecualiId)

  return { jenis: j, anggotaId, anggotaKeluargaId, penyetorAnggotaId, periode, duplikat }
}

export function buatCatatan(input: InputCatatan, ekstra: { setoranId?: number; kelipatan?: number; tanpaBiayaKutip?: boolean } = {}): HasilSimpan {
  pastikanTidakTerkunci(input.tanggal)
  const { jenis: j, anggotaId, anggotaKeluargaId, penyetorAnggotaId, periode, duplikat } = periksaIsi(input, undefined, ekstra.kelipatan ?? 1)
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
        penyetorAnggotaId,
        periode,
        setoranId: ekstra.setoranId ?? null,
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
    // Biaya kutip otomatis (setoran kolektif membuat satu catatan gabungan sendiri)
    if (!ekstra.tanpaBiayaKutip) selaraskanBiayaKutip(baris, j, input.biayaKutip !== false)
    return baris
  })()

  return { perluKonfirmasi: false, catatan }
}

export function ubahCatatan(id: number, input: InputCatatan): HasilSimpan {
  const lama = ambilTransaksi(id)
  if (!lama || lama.dihapusPada) throw new GalatPengguna('Catatan tidak ditemukan. Mungkin sudah dihapus.')
  tolakBilaOtomatis(lama)

  // Tanggal lama DAN baru sama-sama harus di luar periode terkunci
  pastikanTidakTerkunci(lama.tanggal)
  pastikanTidakTerkunci(input.tanggal)
  const { jenis: j, anggotaId, anggotaKeluargaId, penyetorAnggotaId, periode, duplikat } = periksaIsi(input, id)
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
        penyetorAnggotaId,
        periode,
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
    // Catatan dari setoran kolektif memakai biaya kutip gabungan di setorannya, bukan per catatan
    if (!lama.setoranId) selaraskanBiayaKutip(baris, j, input.biayaKutip !== false)
    return baris
  })()

  return { perluKonfirmasi: false, catatan: baru }
}

/** Hapus lunak (docs/02 §5.4): mengisi dihapusPada, baris tetap ada, bisa dikembalikan. */
export function hapusCatatan(id: number, dariSetoran = false): Transaksi {
  const lama = ambilTransaksi(id)
  if (!lama || lama.dihapusPada) throw new GalatPengguna('Catatan tidak ditemukan. Mungkin sudah dihapus.')
  if (!dariSetoran) tolakBilaOtomatis(lama)
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
    // Anak biaya kutip ikut terhapus
    const anak = anakBiayaKutip(id)
    if (anak) {
      const a = db.update(transaksi).set({ dihapusPada: Date.now(), diubahPada: Date.now() }).where(eq(transaksi.id, anak.id)).returning().get()
      catatLog(db, 'hapus', anak, a)
    }
    return baris
  })()
}

export function kembalikanCatatan(id: number): Transaksi {
  const lama = ambilTransaksi(id)
  if (!lama) throw new GalatPengguna('Catatan tidak ditemukan.')
  if (!lama.dihapusPada) throw new GalatPengguna('Catatan ini tidak dalam keadaan terhapus.')
  tolakBilaOtomatis(lama)
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
    // Anak biaya kutip yang ikut terhapus bersama induknya ikut kembali
    const anak = db.select().from(transaksi).where(eq(transaksi.indukId, id)).orderBy(transaksi.id).all().filter((a) => a.dihapusPada).pop()
    if (anak) {
      const a = db.update(transaksi).set({ dihapusPada: null, diubahPada: Date.now() }).where(eq(transaksi.id, anak.id)).returning().get()
      catatLog(db, 'kembalikan', anak, a)
    }
    return baris
  })()
}
