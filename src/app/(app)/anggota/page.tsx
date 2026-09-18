import { wajibSesi } from '@/server/auth/session'
import { daftarAnggota, ringkasanAnggota, saranNomorAnggota } from '@/server/queries/anggota'
import { SARING_ANGGOTA, type SaringAnggota } from '@/lib/anggota'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarAnggota } from '@/components/anggota/DaftarAnggota'

export const dynamic = 'force-dynamic'

// Anggota (docs/01 §5.8): kartu sederhana, tambah/ubah lewat panel geser dari kanan.
export default async function HalamanAnggota({ searchParams }: { searchParams: { cari?: string; saring?: string; hal?: string } }) {
  await wajibSesi()
  const cari = searchParams.cari?.trim() ?? ''
  const saring: SaringAnggota = (SARING_ANGGOTA as readonly string[]).includes(searchParams.saring ?? '') ? (searchParams.saring as SaringAnggota) : 'semua'
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  const { baris, total } = daftarAnggota({ cari, saring }, halaman)
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Anggota</JudulHalaman>
      <DaftarAnggota baris={baris} total={total} halaman={halaman} cari={cari} saring={saring} ringkasan={ringkasanAnggota()} saranNomor={saranNomorAnggota()} />
    </div>
  )
}
