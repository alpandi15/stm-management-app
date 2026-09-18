'use client'
import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Kalender } from './kalender'
import { dariISO, formatTanggalLengkap, keISO, type TanggalISO } from '@/lib/tanggal'
import { cn } from '@/lib/utils'

/**
 * Pemilih tanggal: tombol 48px bertuliskan tanggal lengkap ("Selasa, 20 Januari 2026"),
 * membuka kalender. Nilai selalu 'YYYY-MM-DD' waktu lokal (docs/02 §3.2).
 */
export function PilihTanggal({
  id,
  nilai,
  onUbah,
  maks,
  min,
  placeholder = 'Pilih tanggal',
  nonaktif,
  galat,
  className,
  label,
}: {
  id?: string
  nilai: TanggalISO | '' | null | undefined
  onUbah: (nilai: TanggalISO) => void
  maks?: TanggalISO
  min?: TanggalISO
  placeholder?: string
  nonaktif?: boolean
  galat?: boolean
  className?: string
  label?: string
}) {
  const [terbuka, setTerbuka] = React.useState(false)
  const tanggal = nilai ? dariISO(nilai) : undefined
  const dinonaktifkan = [maks ? { after: dariISO(maks) } : undefined, min ? { before: dariISO(min) } : undefined].filter(Boolean) as Array<{ after: Date } | { before: Date }>

  return (
    <Popover open={terbuka} onOpenChange={setTerbuka}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={label}
          data-galat={galat || undefined}
          disabled={nonaktif}
          className={cn(
            'flex min-h-sentuh w-full items-center gap-3 rounded-input border border-border bg-surface px-4 text-left text-form text-text transition-colors duration-150',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'data-[galat=true]:border-keluar disabled:opacity-50',
            className,
          )}
        >
          <CalendarDays className="size-5 shrink-0 text-muted" />
          <span className={cn('truncate', !nilai && 'text-muted')}>{nilai ? formatTanggalLengkap(nilai) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Kalender
          mode="single"
          required
          selected={tanggal}
          defaultMonth={tanggal}
          disabled={dinonaktifkan.length ? dinonaktifkan : undefined}
          onSelect={(d) => {
            if (!d) return
            onUbah(keISO(d))
            setTerbuka(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
