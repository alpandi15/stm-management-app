import { redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { semuaJenis } from '@/server/queries/jenis'
import { daftarCadangan, namaCadanganBaru } from '@/server/services/cadangan'
import { dataDir } from '@/server/config'
import { VERSI } from '@/lib/versi'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { Kartu } from '@/components/ui/kartu'
import { PilihanTema } from './PilihanTema'
import { KartuIdentitas } from '@/components/pengaturan/KartuIdentitas'
import { KartuSaldoAwal } from '@/components/pengaturan/KartuSaldoAwal'
import { KartuJenis } from '@/components/pengaturan/KartuJenis'
import { KartuKeamanan } from '@/components/pengaturan/KartuKeamanan'
import { KartuPenguncian } from '@/components/pengaturan/KartuPenguncian'
import { KartuCadangan } from '@/components/pengaturan/KartuCadangan'
import { KartuTentang } from '@/components/pengaturan/KartuTentang'

export const dynamic = 'force-dynamic'

// Pengaturan (docs/01 §5.9): satu halaman, kartu bertumpuk, tanpa tab.
export default async function HalamanPengaturan() {
  await wajibSesi()
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Pengaturan</JudulHalaman>
      <KartuIdentitas p={p} />
      <KartuSaldoAwal p={p} />
      <KartuJenis daftar={semuaJenis()} />
      <KartuKeamanan p={p} />
      <KartuPenguncian p={p} />
      <KartuCadangan daftar={daftarCadangan()} namaBawaan={namaCadanganBaru()} />
      <Kartu judul="Tampilan" keterangan="Mode gelap mengikuti pengaturan komputer, atau pilih sendiri.">
        <PilihanTema pilihan={p.tema} />
      </Kartu>
      <KartuTentang versi={VERSI} dataDir={dataDir} />
    </div>
  )
}
