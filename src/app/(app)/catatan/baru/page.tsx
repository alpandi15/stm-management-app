import { wajibSesi } from '@/server/auth/session'
import { catatanTerakhir, daftarAnggotaAktif, daftarJenisAktif, daftarPenyetor, ringkasanCatatan } from '@/server/queries/transaksi'
import { hitungSisaKas } from '@/server/services/laporan'
import { rentangBulanIni } from '@/lib/tanggal'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { TombolKembali } from '@/components/ui/tombol-kembali'
import { FormCatatan } from '@/components/keuangan/FormCatatan'
import { RingkasCepat } from '@/components/keuangan/RingkasCepat'

export const dynamic = 'force-dynamic'

export default async function HalamanCatatBaru({ searchParams }: { searchParams: { jenis?: string; tipe?: string; anggota?: string } }) {
  await wajibSesi()
  const arahAwal = searchParams.jenis === 'masuk' || searchParams.jenis === 'keluar' ? searchParams.jenis : undefined
  const kodeJenisAwal = searchParams.tipe?.match(/^P[MK]\d{2}$/) ? searchParams.tipe : undefined
  const anggotaIdAwal = Number(searchParams.anggota) || undefined
  // Pengingat keadaan kas supaya bendahara tidak perlu membuka Laporan dulu (docs/01 §5.4)
  const bulanIni = ringkasanCatatan({ rentang: rentangBulanIni() })
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <JudulHalaman aksi={<TombolKembali />}>{arahAwal === 'masuk' ? 'Catat Uang Masuk' : arahAwal === 'keluar' ? 'Catat Uang Keluar' : 'Catat'}</JudulHalaman>
      <RingkasCepat sisaKas={hitungSisaKas()} bulanIni={bulanIni} terakhir={catatanTerakhir(3)} />
      <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <FormCatatan daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} daftarPenyetor={daftarPenyetor()} arahAwal={arahAwal} kodeJenisAwal={kodeJenisAwal} anggotaIdAwal={anggotaIdAwal} />
      </div>
    </div>
  )
}
