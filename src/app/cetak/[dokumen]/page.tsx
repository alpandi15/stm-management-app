import { notFound, redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { bacaParameterLaporan } from '@/server/queries/laporan'
import { semuaCatatanDalamRentang } from '@/server/queries/transaksi'
import { perubahanDalamRentang } from '@/server/queries/riwayat'
import { periksaKas, susunLaporan } from '@/server/services/laporan'
import { apakahDokumen, INFO_DOKUMEN, namaBerkasDokumen } from '@/lib/dokumen'
import { BilahCetak } from '@/components/keuangan/cetak/BilahCetak'
import { DokumenRingkas } from '@/components/keuangan/cetak/DokumenRingkas'
import { DokumenBukuKas } from '@/components/keuangan/cetak/DokumenBukuKas'
import { DokumenPemeriksaan } from '@/components/keuangan/cetak/DokumenPemeriksaan'
import { Toaster } from '@/components/kerangka/Toaster'
import '../cetak.css'

export const dynamic = 'force-dynamic'

export function generateMetadata({ params }: { params: { dokumen: string } }) {
  const judul = apakahDokumen(params.dokumen) ? INFO_DOKUMEN[params.dokumen].judul : 'Cetak'
  return { title: `${judul} — Aplikasi Kas STM` }
}

// Halaman cetak (docs/02 §7): bersih tanpa sidebar, A4, memanggil window.print() saat siap.
// Parameter rentang/penyaring sama dengan halaman Laporan. Buku Kas mengabaikan penyaring
// jenis/cara bayar — saldo berjalan hanya bermakna untuk seluruh catatan.
export default async function HalamanCetak({ params, searchParams }: { params: { dokumen: string }; searchParams: Record<string, string | undefined> }) {
  await wajibSesi()
  if (!apakahDokumen(params.dokumen)) notFound()
  const p = ambilPengaturan()
  if (!p) redirect('/setup')

  const dokumen = params.dokumen
  const info = INFO_DOKUMEN[dokumen]
  const { periode, rentang, jenisId, metode } = bacaParameterLaporan(searchParams)
  const laporan = susunLaporan(rentang, dokumen === 'buku-kas' ? undefined : { jenisId, metode })
  const namaBerkas = namaBerkasDokumen(dokumen, periode, rentang)
  const otomatis = searchParams.cetak !== '0'

  return (
    <>
      <style>{`@page { size: A4 ${info.orientasi === 'lanskap' ? 'landscape' : 'portrait'}; margin: 15mm; }`}</style>
      <BilahCetak namaBerkas={namaBerkas} otomatis={otomatis} />
      <main className={`dokumen ${info.orientasi}`}>
        {dokumen === 'ringkas' && <DokumenRingkas laporan={laporan} p={p} />}
        {dokumen === 'buku-kas' && <DokumenBukuKas baris={semuaCatatanDalamRentang(rentang)} sisaAwal={laporan.ringkasan.sisaAwal} rentang={rentang} p={p} />}
        {dokumen === 'pemeriksaan' && <DokumenPemeriksaan pemeriksaan={periksaKas()} laporan={laporan} perubahan={perubahanDalamRentang(rentang)} p={p} />}
      </main>
      <Toaster />
    </>
  )
}
