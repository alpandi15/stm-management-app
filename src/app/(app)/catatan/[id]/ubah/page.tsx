import { notFound } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilCatatan, biayaKutipCatatan, catatanTerakhir, daftarAnggotaAktif, daftarJenisAktif, daftarPenyetor, ringkasanCatatan } from '@/server/queries/transaksi'
import { hitungSisaKas } from '@/server/services/laporan'
import { rentangBulanIni } from '@/lib/tanggal'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { TombolKembali } from '@/components/ui/tombol-kembali'
import { FormCatatan } from '@/components/keuangan/FormCatatan'
import { RingkasCepat } from '@/components/keuangan/RingkasCepat'
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
      <div className="flex flex-col gap-6">
        <JudulHalaman aksi={<TombolKembali />}>Ubah Catatan</JudulHalaman>
        <KeadaanKosong
          judul="Catatan ini dibuat otomatis"
          kalimat={`${catatan.noBukti} adalah biaya kutip yang mengikuti catatan uang masuknya. Ubah atau hapus catatan uang masuk itu — biaya kutipnya menyesuaikan sendiri.`}
          tombol={catatan.indukId ? { label: 'Buka catatan induknya', href: `/catatan/${catatan.indukId}/ubah` } : catatan.setoranId ? { label: 'Buka setorannya', href: `/catatan/setoran/${catatan.setoranId}` } : { label: 'Kembali ke Catatan Kas', href: '/catatan' }}
        />
      </div>
    )
  }
  // Pengingat keadaan kas, sama seperti halaman catat baru (docs/01 §5.4)
  const bulanIni = ringkasanCatatan({ rentang: rentangBulanIni() })
  const sisaKas = hitungSisaKas()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <JudulHalaman aksi={<TombolKembali />}>Ubah Catatan</JudulHalaman>
        <p className="angka text-isi text-muted">{catatan.noBukti}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="order-2 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6 xl:order-1">
          <FormCatatan daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} daftarPenyetor={daftarPenyetor()} awal={catatan} biayaKutipAwal={biayaKutipCatatan(catatan.id)} sisaKas={sisaKas} />
        </div>
        {/* Pengingat keadaan kas: di samping form pada layar lebar, di atasnya pada layar sempit */}
        <div className="order-1 xl:order-2 xl:sticky xl:top-20">
          <RingkasCepat sisaKas={sisaKas} bulanIni={bulanIni} terakhir={catatanTerakhir(3)} />
        </div>
      </div>
    </div>
  )
}
