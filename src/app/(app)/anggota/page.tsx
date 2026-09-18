import { wajibSesi } from '@/server/auth/session'
import { daftarAnggota, saranNomorAnggota } from '@/server/queries/anggota'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarAnggota } from '@/components/anggota/DaftarAnggota'

export const dynamic = 'force-dynamic'

// Anggota (docs/01 §5.8): kartu sederhana, tambah/ubah lewat panel geser dari kanan.
export default async function HalamanAnggota() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Anggota</JudulHalaman>
      <DaftarAnggota baris={daftarAnggota()} saranNomor={saranNomorAnggota()} />
    </div>
  )
}
