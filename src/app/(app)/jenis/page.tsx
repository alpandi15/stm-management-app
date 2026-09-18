import { wajibSesi } from '@/server/auth/session'
import { semuaJenis } from '@/server/queries/jenis'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KartuJenis } from '@/components/pengaturan/KartuJenis'

export const dynamic = 'force-dynamic'

// Jenis Uang (menu sendiri): nominal, kunci, periode, penanda meninggal per jenis.
export default async function HalamanJenis() {
  await wajibSesi()
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Jenis Uang</JudulHalaman>
      <KartuJenis daftar={semuaJenis()} />
    </div>
  )
}
