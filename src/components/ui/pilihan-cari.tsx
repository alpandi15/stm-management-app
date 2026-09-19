'use client'
import * as React from 'react'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { cn } from '@/lib/utils'

export type OpsiPilihan<T extends string | number> = {
  nilai: T
  label: string
  keterangan?: string
  kelompok?: string
}

/**
 * Pilihan yang bisa dicari (pola Combobox shadcn: Popover + cmdk) — pengganti <select>.
 * Target sentuh 48px, daftar dengan kotak cari, navigasi keyboard, centang pada yang terpilih.
 * `bolehBebas`: teks yang diketik boleh dipakai apa adanya bila tidak ada pilihan yang cocok
 * (dipakai untuk "Dari / Untuk siapa": anggota terdaftar atau nama bebas).
 */
export function PilihanCari<T extends string | number>({
  id,
  nilai,
  onUbah,
  pilihan,
  placeholder = 'Pilih…',
  placeholderCari = 'Ketik untuk mencari…',
  labelKosong,
  bolehBebas,
  nonaktif,
  galat,
  className,
  label,
}: {
  id?: string
  nilai: T | null | undefined
  onUbah: (nilai: T | null) => void
  pilihan: ReadonlyArray<OpsiPilihan<T>>
  placeholder?: string
  placeholderCari?: string
  /** Bila diisi, ada pilihan pertama yang mengosongkan nilai (mis. "Semua jenis") */
  labelKosong?: string
  bolehBebas?: boolean
  nonaktif?: boolean
  galat?: boolean
  className?: string
  /** Label aksesibilitas bila tidak ada <label htmlFor> */
  label?: string
}) {
  const [terbuka, setTerbuka] = React.useState(false)
  const [cari, setCari] = React.useState('')
  const idDaftar = React.useId()
  const terpilih = pilihan.find((p) => p.nilai === nilai)
  const teksTerpilih = terpilih?.label ?? (bolehBebas && nilai ? String(nilai) : null)

  const kelompok = React.useMemo(() => {
    const peta = new Map<string, OpsiPilihan<T>[]>()
    for (const p of pilihan) {
      const k = p.kelompok ?? ''
      if (!peta.has(k)) peta.set(k, [])
      peta.get(k)!.push(p)
    }
    return [...peta.entries()]
  }, [pilihan])

  function pilih(v: T | null) {
    onUbah(v)
    setTerbuka(false)
    setCari('')
  }

  const cariBersih = cari.trim()
  const adaYangCocok = cariBersih === '' || pilihan.some((p) => p.label.toLowerCase().includes(cariBersih.toLowerCase()))

  return (
    <Popover open={terbuka} onOpenChange={(o) => { setTerbuka(o); if (!o) setCari('') }}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={terbuka}
          aria-controls={idDaftar}
          aria-label={label}
          aria-invalid={galat || undefined}
          disabled={nonaktif}
          className={cn(
            'flex min-h-sentuh w-full items-center justify-between gap-2 rounded-input border-2 border-border-kuat bg-input px-4 text-left text-form text-text transition-colors duration-150',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'aria-[invalid=true]:border-keluar disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !teksTerpilih && 'text-muted')}>{teksTerpilih ?? placeholder}</span>
          <ChevronsUpDown className="size-5 shrink-0 text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command
          shouldFilter={false}
          className="flex flex-col"
          onKeyDown={(e) => {
            // Enter pada teks bebas yang tidak cocok dengan pilihan mana pun
            if (e.key === 'Enter' && bolehBebas && cariBersih && !adaYangCocok) {
              e.preventDefault()
              pilih(cariBersih as T)
            }
          }}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-5 shrink-0 text-muted" />
            <Command.Input
              autoFocus
              value={cari}
              onValueChange={setCari}
              placeholder={placeholderCari}
              className="min-h-sentuh w-full bg-transparent text-form text-text outline-none placeholder:text-muted"
            />
            {cari && (
              <button type="button" onClick={() => setCari('')} className="flex size-9 items-center justify-center rounded-input text-muted hover:bg-bg" aria-label="Hapus pencarian">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Command.List id={idDaftar} className="max-h-72 overflow-y-auto p-1.5">
            {!adaYangCocok && !bolehBebas && <p className="px-3 py-4 text-center text-isi text-muted">Tidak ada yang cocok dengan “{cariBersih}”.</p>}
            {bolehBebas && cariBersih && !pilihan.some((p) => p.label.toLowerCase() === cariBersih.toLowerCase()) && (
              <Command.Item value={`__bebas__${cariBersih}`} onSelect={() => pilih(cariBersih as T)} className={kelasItem}>
                <span className="flex-1">
                  Pakai nama “<span className="font-semibold">{cariBersih}</span>”
                </span>
              </Command.Item>
            )}
            {labelKosong && !cariBersih && (
              <Command.Item value="__kosong__" onSelect={() => pilih(null)} className={kelasItem}>
                <span className="flex-1">{labelKosong}</span>
                {(nilai === null || nilai === undefined || nilai === '') && <Check className="size-5 text-primary" />}
              </Command.Item>
            )}
            {kelompok.map(([namaKelompok, daftar]) => {
              const tampil = daftar.filter((p) => !cariBersih || p.label.toLowerCase().includes(cariBersih.toLowerCase()))
              if (tampil.length === 0) return null
              return (
                <Command.Group key={namaKelompok} heading={namaKelompok || undefined} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-ket [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted">
                  {tampil.map((p) => (
                    <Command.Item key={String(p.nilai)} value={`${namaKelompok}-${p.nilai}`} onSelect={() => pilih(p.nilai)} className={kelasItem}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.label}</span>
                        {p.keterangan && <span className="block truncate text-ket text-muted">{p.keterangan}</span>}
                      </span>
                      {p.nilai === nilai && <Check className="size-5 shrink-0 text-primary" />}
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const kelasItem =
  'flex min-h-sentuh cursor-pointer select-none items-center gap-3 rounded-input px-3 text-isi outline-none data-[selected=true]:bg-bg aria-selected:bg-bg data-[disabled=true]:opacity-50'
