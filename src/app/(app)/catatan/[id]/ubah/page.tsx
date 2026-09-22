import { notFound } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilCatatan, daftarAnggotaAktif, daftarJenisAktif, daftarPenyetor } from '@/server/queries/transaksi'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { FormCatatan } from '@/components/keuangan/FormCatatan'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export const dynamic = 'force-dynamic'

export default async function HalamanUbahCatatan({ params }: { params: { id: string } }) {
  await wajibSesi()
  const id = Number(params.id)
  const catatan = Number.isInteger(id) ? ambilCatatan(id) : null
  if (!catatan) notFound()
  // Catatan biaya kutip otomatis mengikuti induknya — tidak ada yang bisa diubah di sini
  if (catatan.otomatis) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <JudulHalaman>Ubah Catatan</JudulHalaman>
        <KeadaanKosong
          judul="Catatan ini dibuat otomatis"
          kalimat={`${catatan.noBukti} adalah biaya kutip yang mengikuti catatan uang masuknya. Ubah atau hapus catatan uang masuk itu — biaya kutipnya menyesuaikan sendiri.`}
          tombol={catatan.indukId ? { label: 'Buka catatan induknya', href: `/catatan/${catatan.indukId}/ubah` } : catatan.setoranId ? { label: 'Buka setorannya', href: `/catatan/setoran/${catatan.setoranId}` } : { label: 'Kembali ke Catatan Kas', href: '/catatan' }}
        />
      </div>
    )
  }
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <JudulHalaman>Ubah Catatan</JudulHalaman>
      <p className="angka -mt-3 text-isi text-muted">{catatan.noBukti}</p>
      <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6">
        <FormCatatan daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} daftarPenyetor={daftarPenyetor()} awal={catatan} />
      </div>
    </div>
  )
}
