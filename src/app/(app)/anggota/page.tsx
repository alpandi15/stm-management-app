import { wajibSesi } from '@/server/auth/session'
import { daftarAnggota, ringkasanAnggota, saranNomorAnggota } from '@/server/queries/anggota'
import { tarifTunggakanLamaTerpakai } from '@/server/queries/duka'
import { daftarRt } from '@/server/queries/rt'
import { SARING_ANGGOTA, type SaringAnggota } from '@/lib/anggota'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { DaftarAnggota } from '@/components/anggota/DaftarAnggota'

export const dynamic = 'force-dynamic'

// Anggota (docs/01 §5.8): kartu sederhana, tambah/ubah lewat panel geser dari kanan.
export default async function HalamanAnggota({ searchParams }: { searchParams: { cari?: string; saring?: string; hal?: string; rt?: string } }) {
  await wajibSesi()
  const cari = searchParams.cari?.trim() ?? ''
  const saring: SaringAnggota = (SARING_ANGGOTA as readonly string[]).includes(searchParams.saring ?? '') ? (searchParams.saring as SaringAnggota) : 'semua'
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  // rt=<id> menyaring satu RT; rt=tanpa menampilkan anggota yang belum punya RT
  const rtParam = searchParams.rt ?? ''
  const rtId = rtParam === 'tanpa' ? 'tanpa' : Number.isInteger(Number(rtParam)) && Number(rtParam) > 0 ? Number(rtParam) : undefined
  const { baris, total } = daftarAnggota({ cari, saring, rtId }, halaman)
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Anggota</JudulHalaman>
      <DaftarAnggota baris={baris} total={total} halaman={halaman} cari={cari} saring={saring} ringkasan={ringkasanAnggota()} saranNomor={saranNomorAnggota()} tarifSaran={tarifTunggakanLamaTerpakai()} daftarRt={daftarRt()} rtId={rtId} />
    </div>
  )
}
