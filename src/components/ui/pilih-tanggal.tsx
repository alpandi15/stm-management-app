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
 * `inline` menampilkan kalender langsung di dalam form (tanpa popover) — untuk form yang
 * dipakai pengguna lanjut usia: popover yang menutup saat memilih bulan membingungkan.
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
  inline,
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
  inline?: boolean
}) {
  const [terbuka, setTerbuka] = React.useState(false)
  const tanggal = nilai ? dariISO(nilai) : undefined
  const dinonaktifkan = [maks ? { after: dariISO(maks) } : undefined, min ? { before: dariISO(min) } : undefined].filter(Boolean) as Array<{ after: Date } | { before: Date }>

  if (inline) {
    return (
      <div
        id={id}
        data-galat={galat || undefined}
        className={cn('flex flex-col gap-2 rounded-input border-2 border-border-kuat bg-input p-3 data-[galat=true]:border-keluar sm:flex-row sm:items-start sm:gap-4', className)}
      >
        <Kalender
          mode="single"
          required
          selected={tanggal}
          defaultMonth={tanggal}
          disabled={dinonaktifkan.length ? dinonaktifkan : undefined}
          onSelect={(d) => d && onUbah(keISO(d))}
          className="p-0"
          classNames={{ day_button: 'angka flex size-11 items-center justify-center rounded-input text-form transition-colors duration-150 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', weekday: 'w-11 text-center text-ket font-semibold uppercase text-muted' }}
        />
        <div className="flex flex-1 items-center gap-3 rounded-input bg-primary-soft px-4 py-3 text-primary sm:self-stretch">
          <CalendarDays className="size-6 shrink-0" />
          <div>
            <p className="text-ket font-semibold uppercase tracking-wide">Tanggal dipilih</p>
            <p className="text-form font-bold">{nilai ? formatTanggalLengkap(nilai) : placeholder}</p>
          </div>
        </div>
      </div>
    )
  }

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
            'flex min-h-sentuh w-full items-center gap-3 rounded-input border-2 border-border-kuat bg-input px-4 text-left text-form text-text transition-colors duration-150',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'data-[galat=true]:border-keluar disabled:opacity-50',
            className,
          )}
        >
          <CalendarDays className="size-5 shrink-0 text-primary" />
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
