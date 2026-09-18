import { notFound } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilCatatan, daftarAnggotaAktif, daftarJenisAktif } from '@/server/queries/transaksi'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { FormCatatan } from '@/components/keuangan/FormCatatan'

export const dynamic = 'force-dynamic'

export default async function HalamanUbahCatatan({ params }: { params: { id: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const catatan = Number.isInteger(id) ? ambilCatatan(id) : null
  if (!catatan) notFound()
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <JudulHalaman>Ubah Catatan</JudulHalaman>
      <p className="angka -mt-3 text-isi text-muted">{catatan.noBukti}</p>
      <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <FormCatatan daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} awal={catatan} />
      </div>
    </div>
  )
}
