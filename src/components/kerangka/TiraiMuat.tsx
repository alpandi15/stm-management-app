import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Tirai muat satu layar penuh: ikon berputar + "Memuat…" di atas isi yang meredup. Muncul setelah 100 ms agar halaman instan tidak berkedip. */
export function TiraiMuat({ className, sumber }: { className?: string; sumber?: string }) {
  return (
    <div role="status" aria-live="polite" data-tirai-muat={sumber ?? 'segmen'} className={cn('animasi-tirai fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-tirai', className)}>
      <div className="flex flex-col items-center gap-3 rounded-kartu border border-border bg-surface px-8 py-6 shadow-kartu">
        <LoaderCircle className="size-9 animate-spin text-primary" />
        <p className="text-isi font-semibold">Memuat…</p>
      </div>
    </div>
  )
}
