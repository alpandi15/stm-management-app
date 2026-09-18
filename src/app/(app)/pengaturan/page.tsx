import { redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { PilihanTema } from './PilihanTema'

export const dynamic = 'force-dynamic'

// Kerangka Pengaturan (docs/01 §5.9): kartu bertumpuk, tanpa tab.
// Fase 3 hanya membawa kartu Tampilan; kartu lainnya dibuat di Fase 8.
export default async function HalamanPengaturan() {
  await wajibSesi()
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  return (
    <div className="flex flex-col gap-6">
      <JudulHalaman>Pengaturan</JudulHalaman>
      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu">
        <h2 className="text-judul-kartu font-semibold">Tampilan</h2>
        <p className="mt-1 text-ket text-muted">Mode gelap mengikuti pengaturan komputer, atau pilih sendiri.</p>
        <PilihanTema pilihan={p.tema} />
      </section>
    </div>
  )
}
