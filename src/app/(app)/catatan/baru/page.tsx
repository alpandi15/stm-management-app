import { wajibSesi } from '@/server/auth/session'
import { daftarAnggotaAktif, daftarJenisAktif } from '@/server/queries/transaksi'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { FormCatatan } from '@/components/keuangan/FormCatatan'

export const dynamic = 'force-dynamic'

export default async function HalamanCatatBaru({ searchParams }: { searchParams: { jenis?: string } }) {
  await wajibSesi()
  const arahAwal = searchParams.jenis === 'masuk' || searchParams.jenis === 'keluar' ? searchParams.jenis : undefined
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <JudulHalaman>{arahAwal === 'masuk' ? 'Catat Uang Masuk' : arahAwal === 'keluar' ? 'Catat Uang Keluar' : 'Catat'}</JudulHalaman>
      <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <FormCatatan daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} arahAwal={arahAwal} />
      </div>
    </div>
  )
}
