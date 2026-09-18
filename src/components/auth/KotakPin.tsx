import { cn } from '@/lib/utils'

/** Enam kotak PIN. Menampilkan titik untuk digit terisi; tidak pernah menampilkan angkanya. */
export function KotakPin({ terisi, getar, label }: { terisi: number; getar?: boolean; label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${terisi} dari 6 angka terisi`}
      className={cn('flex justify-center gap-3', getar && 'animate-getar')}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex size-12 items-center justify-center rounded-input border-2 bg-surface transition-colors duration-150 sm:size-14',
            i < terisi ? 'border-primary' : 'border-border',
          )}
        >
          {i < terisi && <span className="size-3.5 rounded-full bg-text" />}
        </div>
      ))}
    </div>
  )
}
