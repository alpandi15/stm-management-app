import 'server-only'
import { and, eq, isNull, sql, sum } from 'drizzle-orm'
import { db } from '@/server/db'
import { transaksi } from '@/server/db/schema'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { semuaLogUrut } from '@/server/queries/riwayat'
import { grafikBulanan, rincianPerJenis, ringkasanPeriode, totalDalamRentang, type PenyaringLaporan, type RincianJenis, type RingkasanPeriode } from './laporan-rumus'
import { rentangBulanIni, rentangBulanLalu, type Rentang } from '@/lib/tanggal'

// Satu-satunya tempat rumus keuangan hidup (docs/02 §6). Beranda, Laporan, Catatan Kas,
// dan dokumen cetak semuanya memanggil fungsi di sini. Semua penjumlahan lewat agregat SQL.
// Rumusnya sendiri ada di laporan-rumus.ts (murni, diuji); berkas ini mengikatnya ke
// database sungguhan dan pengaturan (saldo awal).

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

export type PemeriksaanKas = {
  saldoAwal: number
  masuk: number
  keluar: number
  /** Saldo awal + masuk − keluar dari tabel transaksi */
  seharusnya: number
  /** Hasil pemutaran ulang seluruh log — jalur hitung yang terpisah */
  sebenarnya: number
  cocok: boolean
  jumlahLog: number
}

/**
 * Pemeriksaan Kas (docs/01 §5.7): rumus dari tabel transaksi dibandingkan dengan pemutaran
 * ulang log (buat +, hapus −, kembalikan +, ubah selisih). Keduanya seharusnya sama persis;
 * bila tidak, ada baris yang berubah di luar jalur aplikasi atau log yang hilang.
 */
export function periksaKas(): PemeriksaanKas {
  const saldoAwal = ambilPengaturan()?.saldoAwal ?? 0
  const masuk = totalArah('masuk')
  const keluar = totalArah('keluar')
  const seharusnya = saldoAwal + masuk - keluar

  const nilai = (t: { arah: string; jumlah: number } | null) => (t ? (t.arah === 'masuk' ? t.jumlah : -t.jumlah) : 0)
  let saldoLog = saldoAwal
  const entri = semuaLogUrut()
  for (const e of entri) {
    switch (e.aksi) {
      case 'buat':
      case 'kembalikan':
        saldoLog += nilai(e.baru)
        break
      case 'hapus':
        saldoLog -= nilai(e.lama)
        break
      case 'ubah':
        saldoLog += nilai(e.baru) - nilai(e.lama)
        break
    }
  }

  return { saldoAwal, masuk, keluar, seharusnya, sebenarnya: saldoLog, cocok: seharusnya === saldoLog, jumlahLog: entri.length }
}

export type Laporan = {
  rentang: Rentang
  ringkasan: RingkasanPeriode
  rincianMasuk: RincianJenis[]
  rincianKeluar: RincianJenis[]
}

/** Laporan satu rentang (docs/02 §6): dipakai halaman Laporan dan dokumen cetak. */
export function susunLaporan(rentang: Rentang, penyaring?: PenyaringLaporan): Laporan {
  const saldoAwal = ambilPengaturan()?.saldoAwal ?? 0
  return {
    rentang,
    ringkasan: ringkasanPeriode(db, saldoAwal, rentang, penyaring),
    rincianMasuk: rincianPerJenis(db, rentang, 'masuk', penyaring),
    rincianKeluar: rincianPerJenis(db, rentang, 'keluar', penyaring),
  }
}

export type DataBeranda = {
  sisaKas: number
  bulanIni: { masuk: number; keluar: number }
  bulanLalu: { masuk: number; keluar: number }
  grafik: ReturnType<typeof grafikBulanan>
  tahun: number
}

/** Angka Beranda — memakai rumus yang sama dengan Laporan, bukan query sendiri. */
export function dataBeranda(): DataBeranda {
  const tahun = new Date().getFullYear()
  return {
    sisaKas: hitungSisaKas(),
    bulanIni: totalDalamRentang(db, rentangBulanIni()),
    bulanLalu: totalDalamRentang(db, rentangBulanLalu()),
    grafik: grafikBulanan(db, tahun),
    tahun,
  }
}
