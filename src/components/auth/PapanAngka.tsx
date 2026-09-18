'use client'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOMBOL = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/** Papan angka 3×4 di layar (docs/01 §5.2). Tombol 64px — jauh lebih nyaman dari keyboard. */
export function PapanAngka({
  onAngka,
  onHapus,
  nonaktif,
}: {
  onAngka: (d: string) => void
  onHapus: () => void
  nonaktif?: boolean
}) {
  const kelas =
    'flex min-h-aksi-besar items-center justify-center rounded-input border border-border bg-surface text-judul font-semibold text-text transition-colors duration-150 hover:bg-bg active:bg-border disabled:opacity-40 disabled:pointer-events-none select-none'
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3" aria-label="Papan angka">
      {TOMBOL.map((d) => (
        <button key={d} type="button" className={kelas} onClick={() => onAngka(d)} disabled={nonaktif}>
          {d}
        </button>
      ))}
      <div aria-hidden />
      <button type="button" className={kelas} onClick={() => onAngka('0')} disabled={nonaktif}>
        0
      </button>
      <button type="button" className={cn(kelas, 'text-muted')} onClick={onHapus} disabled={nonaktif} aria-label="Hapus satu angka">
        <Delete className="size-7" />
      </button>
    </div>
  )
}
