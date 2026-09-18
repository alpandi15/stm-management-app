import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { kunci } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

// Kerangka sementara Fase 2: header dengan nama STM dan tombol Kunci.
// Sidebar, bilah bawah, dan tema lengkap dibuat di Fase 3 (docs/01 §4).
export default async function LayoutAplikasi({ children }: { children: React.ReactNode }) {
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  await wajibSesi()

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <span className="text-judul-kartu font-semibold">{p.namaStm}</span>
        <form action={kunci}>
          <Button type="submit" variant="sekunder">
            <Lock />
            Kunci
          </Button>
        </form>
      </header>
      <main className="mx-auto max-w-konten p-4 sm:p-6">{children}</main>
    </div>
  )
}
