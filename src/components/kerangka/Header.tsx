import { Lock } from 'lucide-react'
import { kunci } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import { TombolPengaturan } from './TombolPengaturan'
import { Logo } from './Logo'

/** Header: nama STM di kiri, tombol Kunci di kanan (docs/01 §4). Tanpa avatar, notifikasi, pencarian. */
export function Header({ namaStm }: { namaStm: string }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <span className="flex min-w-0 items-center gap-3 lg:sr-only">
        <Logo ukuran={36} className="md:hidden" />
        <span className="truncate text-judul-kartu font-semibold">{namaStm}</span>
      </span>
      <span className="hidden text-isi text-muted md:block" aria-hidden />
      <div className="flex shrink-0 items-center gap-2">
        <TombolPengaturan />
        <form action={kunci}>
          <Button type="submit" variant="sekunder">
            <Lock />
            Kunci
          </Button>
        </form>
      </div>
    </header>
  )
}
