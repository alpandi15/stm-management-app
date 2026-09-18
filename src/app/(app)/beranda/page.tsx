import Link from 'next/link'
import { Minus, Plus, Users } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { dataBeranda } from '@/server/services/laporan'
import { catatanTerakhir } from '@/server/queries/transaksi'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { KartuAngka } from '@/components/laporan/KartuAngka'
import { KartuSisaKas } from '@/components/beranda/KartuSisaKas'
import { GrafikBulanan } from '@/components/beranda/GrafikBulanan'
import { DaftarRingkas } from '@/components/beranda/DaftarRingkas'

export const dynamic = 'force-dynamic'

/** Perbandingan dengan bulan lalu dalam kalimat, bukan panah persentase (docs/01 §5.3). */
function kalimatBanding(sekarang: number, lalu: number): string {
  if (sekarang === lalu) return 'Sama dengan bulan lalu'
  const selisih = Math.abs(sekarang - lalu)
  return `${formatRupiah(selisih)} ${sekarang > lalu ? 'lebih banyak' : 'lebih sedikit'} dari bulan lalu`
}

// Beranda (docs/01 §5.3). Semua angka dari services/laporan.ts — rumus yang sama dengan Laporan.
export default async function HalamanBeranda() {
  await wajibSesi()
  const d = dataBeranda()
  const terakhir = catatanTerakhir(5)

  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Beranda</JudulHalaman>

      <KartuSisaKas sisaKas={d.sisaKas} diperbarui={terakhir[0]?.tanggal ?? null} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button asChild variant="masuk" ukuran="besar">
          <Link href="/catatan/baru?jenis=masuk">
            <Plus className="size-6" /> Catat Uang Masuk
          </Link>
        </Button>
        <Button asChild variant="keluar" ukuran="besar">
          <Link href="/catatan/baru?jenis=keluar">
            <Minus className="size-6" /> Catat Uang Keluar
          </Link>
        </Button>
      </div>

      <Button asChild variant="sekunder" className="w-full sm:w-fit">
        <Link href="/catatan/setoran/baru">
          <Users /> Catat Iuran Kolektif
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KartuAngka label="Uang Masuk Bulan Ini" nilai={d.bulanIni.masuk} warna="masuk" keterangan={kalimatBanding(d.bulanIni.masuk, d.bulanLalu.masuk)} />
        <KartuAngka label="Uang Keluar Bulan Ini" nilai={d.bulanIni.keluar} warna="keluar" keterangan={kalimatBanding(d.bulanIni.keluar, d.bulanLalu.keluar)} />
      </div>

      <GrafikBulanan data={d.grafik} tahun={d.tahun} />

      {terakhir.length === 0 ? (
        <KeadaanKosong
          judul="Belum ada catatan"
          kalimat="Catatan terakhir akan tampil di sini setelah Anda mencatat uang masuk atau keluar yang pertama."
          tombol={{ label: 'Catat Uang Masuk', href: '/catatan/baru?jenis=masuk' }}
        />
      ) : (
        <DaftarRingkas baris={terakhir} />
      )}
    </div>
  )
}
