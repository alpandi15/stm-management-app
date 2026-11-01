import { wajibSesi } from '@/server/auth/session'
import { catatanTerakhir, daftarAnggotaAktif, daftarJenisAktif, daftarPenyetor, ringkasanCatatan } from '@/server/queries/transaksi'
import { hitungSisaKas } from '@/server/services/laporan'
import { rentangBulanIni } from '@/lib/tanggal'
import { daftarAlmarhum } from '@/server/queries/anggota'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { TombolKembali } from '@/components/ui/tombol-kembali'
import { FormSetoran } from '@/components/setoran/FormSetoran'
import { RingkasCepat } from '@/components/keuangan/RingkasCepat'

export const dynamic = 'force-dynamic'

export default async function HalamanSetoranBaru() {
  await wajibSesi()
  const sisaKas = hitungSisaKas()
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <JudulHalaman aksi={<TombolKembali />}>Catat Iuran Kolektif</JudulHalaman>
      <p className="-mt-3 text-isi text-muted">Satu setoran untuk banyak anggota sekaligus — centang siapa yang bayar dan siapa yang menyetor.</p>
      <RingkasCepat sisaKas={sisaKas} bulanIni={ringkasanCatatan({ rentang: rentangBulanIni() })} terakhir={catatanTerakhir(3)} />
      <FormSetoran sisaKas={sisaKas} daftarJenis={daftarJenisAktif()} daftarAnggota={daftarAnggotaAktif()} daftarPenyetor={daftarPenyetor()} almarhum={daftarAlmarhum()} />
    </div>
  )
}
