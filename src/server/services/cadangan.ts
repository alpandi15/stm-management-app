import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { format } from 'date-fns'
import { dataDir, dbFile, sqlite, tandaiCadanganOtomatis, tutupKoneksi, bukaUlangKoneksi } from '@/server/db'
import { GalatPengguna } from '@/server/galat'
import { formatRupiah } from '@/lib/rupiah'

/** Folder cadangan otomatis dan "sebelum-pulihkan" (docs/02 §8). */
export const cadanganDir = path.join(dataDir, 'cadangan')
const SISAKAN = 10

function stempel(d = new Date()) {
  return format(d, 'yyyyMMdd-HHmm')
}

/**
 * VACUUM INTO: salinan konsisten walau database sedang dipakai, sekaligus dimampatkan —
 * jauh lebih aman daripada menyalin berkas .db mentah yang bisa tertangkap di tengah WAL.
 */
export function cadangkanKe(tujuan: string): string {
  fs.mkdirSync(path.dirname(tujuan), { recursive: true })
  if (fs.existsSync(tujuan)) fs.rmSync(tujuan) // VACUUM INTO menolak berkas yang sudah ada
  sqlite.exec(`VACUUM INTO '${tujuan.replace(/'/g, "''")}'`)
  return tujuan
}

/** Nama bawaan untuk dialog simpan / unduhan. */
export function namaCadanganBaru(): string {
  return `stm-cadangan-${stempel()}.db`
}

/** Cadangan otomatis saat aplikasi dibuka (docs/02 §8.1): sekali per proses, sisakan 10 terbaru. */
export function cadanganOtomatisSaatBuka(): void {
  if (!tandaiCadanganOtomatis()) return
  try {
    cadangkanKe(path.join(cadanganDir, `stm-${stempel()}.db`))
    for (const b of daftarCadangan().filter((b) => b.jenis === 'otomatis').slice(SISAKAN)) fs.rmSync(b.path, { force: true })
  } catch (e) {
    console.error('[cadangan] gagal membuat cadangan otomatis:', e)
  }
}

export type InfoCadangan = { nama: string; path: string; ukuran: number; dibuatPada: number; jenis: 'otomatis' | 'sebelum-pulihkan' | 'unggahan' }

/** Berkas cadangan di folder data, terbaru dulu. */
export function daftarCadangan(): InfoCadangan[] {
  if (!fs.existsSync(cadanganDir)) return []
  return fs
    .readdirSync(cadanganDir)
    .filter((n) => n.endsWith('.db'))
    .map((nama) => {
      const p = path.join(cadanganDir, nama)
      const st = fs.statSync(p)
      const jenis: InfoCadangan['jenis'] = nama.startsWith('sebelum-pulihkan') ? 'sebelum-pulihkan' : nama.startsWith('unggah') ? 'unggahan' : 'otomatis'
      return { nama, path: p, ukuran: st.size, dibuatPada: st.mtimeMs, jenis }
    })
    .sort((a, b) => b.dibuatPada - a.dibuatPada)
}

export type RingkasanBerkas = {
  path: string
  namaStm: string
  jumlahCatatan: number
  tanggalAwal: string | null
  tanggalAkhir: string | null
  sisaKas: number
  sisaKasTeks: string
}

/** Langkah 1–2 pulihkan (docs/02 §8.3): buka read-only, pastikan tabel ada, ringkas isinya. */
export function periksaBerkasPulihkan(berkas: string): RingkasanBerkas {
  if (!fs.existsSync(berkas)) throw new GalatPengguna('Berkas tidak ditemukan. Pilih ulang berkas cadangannya.')
  let sumber: Database.Database | null = null
  try {
    sumber = new Database(berkas, { readonly: true, fileMustExist: true })
    const tabel = sumber.prepare("select name from sqlite_master where type='table' and name in ('pengaturan','transaksi')").all() as Array<{ name: string }>
    if (tabel.length < 2) throw new GalatPengguna('Berkas ini bukan cadangan Aplikasi Kas STM.')
    const p = sumber.prepare('select nama_stm, saldo_awal from pengaturan where id = 1').get() as { nama_stm: string; saldo_awal: number } | undefined
    if (!p) throw new GalatPengguna('Berkas cadangan ini belum berisi pengaturan awal, jadi tidak bisa dipulihkan.')
    const t = sumber
      .prepare(
        "select count(*) n, min(tanggal) awal, max(tanggal) akhir, coalesce(sum(case when arah='masuk' then jumlah else 0 end),0) masuk, coalesce(sum(case when arah='keluar' then jumlah else 0 end),0) keluar from transaksi where dihapus_pada is null",
      )
      .get() as { n: number; awal: string | null; akhir: string | null; masuk: number; keluar: number }
    const sisaKas = p.saldo_awal + t.masuk - t.keluar
    return { path: berkas, namaStm: p.nama_stm, jumlahCatatan: t.n, tanggalAwal: t.awal, tanggalAkhir: t.akhir, sisaKas, sisaKasTeks: formatRupiah(sisaKas) }
  } catch (e) {
    if (e instanceof GalatPengguna) throw e
    throw new GalatPengguna('Berkas tidak bisa dibaca sebagai database. Pastikan ini berkas .db dari aplikasi ini.')
  } finally {
    sumber?.close()
  }
}

/**
 * Langkah 3–4 pulihkan: cadangkan database aktif, tutup koneksi, timpa berkas, buka ulang.
 * Berkas WAL/SHM lama dibuang supaya tidak "menimpa balik" isi database baru.
 */
export function pulihkanDari(berkas: string): { cadanganSebelum: string } {
  periksaBerkasPulihkan(berkas)
  const cadanganSebelum = cadangkanKe(path.join(cadanganDir, `sebelum-pulihkan-${stempel()}.db`))
  tutupKoneksi()
  try {
    for (const ekor of ['-wal', '-shm']) fs.rmSync(dbFile + ekor, { force: true })
    fs.copyFileSync(berkas, dbFile)
  } finally {
    bukaUlangKoneksi()
  }
  return { cadanganSebelum }
}

/** Menyimpan berkas unggahan (mode browser) ke folder cadangan untuk diperiksa. */
export async function simpanUnggahanPulihkan(berkas: { arrayBuffer(): Promise<ArrayBuffer>; size: number }): Promise<string> {
  if (berkas.size > 200 * 1024 * 1024) throw new GalatPengguna('Berkas terlalu besar untuk diunggah.')
  fs.mkdirSync(cadanganDir, { recursive: true })
  const tujuan = path.join(cadanganDir, `unggah-${stempel()}.db`)
  fs.writeFileSync(tujuan, Buffer.from(await berkas.arrayBuffer()))
  return tujuan
}
