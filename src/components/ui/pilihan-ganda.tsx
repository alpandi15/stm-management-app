'use client'
import { cn } from '@/lib/utils'

/**
 * Dua–empat tombol besar berdampingan sebagai pengganti dropdown (docs/01 §5.5):
 * Uang Masuk / Uang Keluar, Tunai / Transfer, Hari Ini / Kemarin / Pilih Tanggal.
 */
export function PilihanGanda<T extends string>({
  nilai,
  pilihan,
  onPilih,
  label,
  nonaktif,
  warnaArah,
}: {
  nilai: T | null
  pilihan: ReadonlyArray<{ nilai: T; label: string; Ikon?: React.ComponentType<{ className?: string }> }>
  onPilih: (v: T) => void
  label: string
  nonaktif?: boolean
  /** Bila true, 'masuk' hijau dan 'keluar' merah saat terpilih */
  warnaArah?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${pilihan.length}, minmax(0, 1fr))` }}>
      {pilihan.map(({ nilai: v, label: l, Ikon }) => {
        const aktif = v === nilai
        const warna =
          warnaArah && aktif
            ? v === 'masuk'
              ? 'border-masuk bg-masuk text-arah-fg'
              : 'border-keluar bg-keluar text-arah-fg'
            : aktif
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-surface text-text hover:bg-bg'
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={aktif}
            disabled={nonaktif}
            onClick={() => onPilih(v)}
            className={cn(
              'flex min-h-aksi items-center justify-center gap-2 rounded-input border-2 px-3 text-form font-semibold transition-colors duration-150 disabled:opacity-50',
              warna,
            )}
          >
            {Ikon && <Ikon className="size-5" />}
            {l}
          </button>
        )
      })}
    </div>
  )
}
