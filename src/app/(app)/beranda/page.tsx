import Link from 'next/link'
import { Minus, Plus } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

// Kerangka Beranda (docs/01 §5.3). Kartu sisa kas, statistik, grafik, dan catatan terakhir
// diisi di Fase 6 memakai services/laporan.ts.
export default async function HalamanBeranda() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Beranda</JudulHalaman>

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

      <KeadaanKosong
        judul="Belum ada catatan"
        kalimat="Sisa uang kas, grafik, dan catatan terakhir akan tampil di sini setelah Anda mencatat uang masuk atau keluar yang pertama."
      />
    </div>
  )
}
