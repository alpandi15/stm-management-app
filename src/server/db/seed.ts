import { eq } from 'drizzle-orm'
import type { Db } from './index'
import { jenis, type Arah } from './schema'

// 19 jenis bawaan (docs/02 §3.4). Idempoten berdasarkan `kode`:
// yang sudah ada tidak disentuh, supaya nama yang diubah pengguna tidak tertimpa.
const JENIS_BAWAAN: ReadonlyArray<{ kode: string; nama: string; arah: Arah }> = [
  { kode: 'PM01', nama: 'Iuran Wajib Anggota', arah: 'masuk' },
  { kode: 'PM02', nama: 'Iuran Sukarela', arah: 'masuk' },
  { kode: 'PM03', nama: 'Uang Pangkal Anggota Baru', arah: 'masuk' },
  { kode: 'PM04', nama: 'Sumbangan / Donasi', arah: 'masuk' },
  { kode: 'PM05', nama: 'Denda Anggota', arah: 'masuk' },
  { kode: 'PM06', nama: 'Hasil Usaha & Kegiatan', arah: 'masuk' },
  { kode: 'PM07', nama: 'Pengembalian Pinjaman', arah: 'masuk' },
  { kode: 'PM08', nama: 'Jasa / Bunga Bank', arah: 'masuk' },
  { kode: 'PM09', nama: 'Penerimaan Lain-lain', arah: 'masuk' },
  { kode: 'PK01', nama: 'Santunan Duka / Kemalangan', arah: 'keluar' },
  { kode: 'PK02', nama: 'Bantuan Sakit / Rawat Inap', arah: 'keluar' },
  { kode: 'PK03', nama: 'Bantuan Pernikahan', arah: 'keluar' },
  { kode: 'PK04', nama: 'Konsumsi Rapat & Kegiatan', arah: 'keluar' },
  { kode: 'PK05', nama: 'Transportasi & Akomodasi', arah: 'keluar' },
  { kode: 'PK06', nama: 'Perlengkapan & ATK', arah: 'keluar' },
  { kode: 'PK07', nama: 'Sewa Tempat & Peralatan', arah: 'keluar' },
  { kode: 'PK08', nama: 'Biaya Administrasi Bank', arah: 'keluar' },
  { kode: 'PK09', nama: 'Sumbangan Sosial Keluar', arah: 'keluar' },
  { kode: 'PK10', nama: 'Pengeluaran Lain-lain', arah: 'keluar' },
]

/** Menyisipkan jenis bawaan yang belum ada. Mengembalikan jumlah yang baru ditambahkan. */
export function seedJenisBawaan(db: Db): number {
  let ditambahkan = 0
  db.transaction((tx) => {
    JENIS_BAWAAN.forEach((j, i) => {
      const ada = tx.select({ id: jenis.id }).from(jenis).where(eq(jenis.kode, j.kode)).get()
      if (ada) return
      tx.insert(jenis)
        .values({ ...j, urutan: i + 1, aktif: true, bawaan: true })
        .run()
      ditambahkan += 1
    })
  })
  return ditambahkan
}

export { JENIS_BAWAAN }
