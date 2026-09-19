'use client'
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type OpsiPilihan<T extends string | number> = {
  nilai: T
  label: string
  keterangan?: string
  kelompok?: string
}

/**
 * Pilihan yang bisa dicari — tampil sebagai **modal di tengah layar** dengan latar gelap,
 * bukan dropdown: pengguna lanjut usia sulit membedakan dropdown dari latar halaman.
 * Kotak cari langsung terfokus; pilihan 48px dengan garis pemisah tegas; yang terpilih
 * diberi centang dan latar biru muda. Navigasi keyboard (panah, Enter) lewat cmdk.
 * `bolehBebas`: teks yang diketik boleh dipakai apa adanya bila tidak ada pilihan yang cocok.
 */
export function PilihanModal<T extends string | number>({
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
  judul,
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
  /** Judul modal; bawaan mengikuti label/placeholder */
  judul?: string
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
  const cocok = (p: OpsiPilihan<T>) => !cariBersih || `${p.label} ${p.keterangan ?? ''}`.toLowerCase().includes(cariBersih.toLowerCase())
  const jumlahCocok = pilihan.filter(cocok).length
  const adaYangCocok = cariBersih === '' || jumlahCocok > 0
  const judulModal = judul ?? label ?? (placeholder.replace(/…$/, '') || 'Pilih')

  return (
    <DialogPrimitive.Root
      open={terbuka}
      onOpenChange={(o) => {
        setTerbuka(o)
        if (!o) setCari('')
      }}
    >
      <DialogPrimitive.Trigger asChild>
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
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-kartu border-2 border-border-kuat bg-surface text-text shadow-kartu focus:outline-none"
          onOpenAutoFocus={(e) => {
            // Fokus ke kotak cari, bukan ke elemen pertama
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).querySelector<HTMLInputElement>('[cmdk-input]')?.focus()
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <DialogPrimitive.Title className="text-judul-kartu font-semibold">{judulModal}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex size-10 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label="Tutup">
              <X className="size-6" />
            </DialogPrimitive.Close>
          </div>
          <Command
            shouldFilter={false}
            className="flex min-h-0 flex-1 flex-col"
            onKeyDown={(e) => {
              // Enter pada teks bebas yang tidak cocok dengan pilihan mana pun
              if (e.key === 'Enter' && bolehBebas && cariBersih && !adaYangCocok) {
                e.preventDefault()
                pilih(cariBersih as T)
              }
            }}
          >
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2 rounded-input border-2 border-primary bg-input px-3 focus-within:ring-2 focus-within:ring-primary">
                <Search className="size-5 shrink-0 text-primary" />
                <Command.Input
                  autoFocus
                  value={cari}
                  onValueChange={setCari}
                  placeholder={placeholderCari}
                  className="min-h-aksi w-full bg-transparent text-form text-text outline-none placeholder:text-muted"
                />
                {cari && (
                  <button type="button" onClick={() => setCari('')} className="flex size-9 items-center justify-center rounded-input text-muted hover:bg-bg" aria-label="Hapus pencarian">
                    <X className="size-5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-ket text-muted">{cariBersih ? `${jumlahCocok} pilihan cocok` : `${pilihan.length} pilihan · ketik untuk mencari`}</p>
            </div>
            <Command.List id={idDaftar} className="min-h-0 flex-1 overflow-y-auto p-3">
              {!adaYangCocok && !bolehBebas && <p className="px-3 py-6 text-center text-isi text-muted">Tidak ada yang cocok dengan “{cariBersih}”.</p>}
              {bolehBebas && cariBersih && !pilihan.some((p) => p.label.toLowerCase() === cariBersih.toLowerCase()) && (
                <Command.Item value={`__bebas__${cariBersih}`} onSelect={() => pilih(cariBersih as T)} className={cn(kelasItem, 'border-dashed')}>
                  <span className="flex-1">
                    Pakai nama “<span className="font-semibold">{cariBersih}</span>”
                  </span>
                </Command.Item>
              )}
              {labelKosong && !cariBersih && (
                <Command.Item value="__kosong__" onSelect={() => pilih(null)} className={cn(kelasItem, (nilai === null || nilai === undefined || nilai === '') && kelasTerpilih)}>
                  <span className="flex-1 text-muted">{labelKosong}</span>
                  {(nilai === null || nilai === undefined || nilai === '') && <Check className="size-6 text-primary" strokeWidth={3} />}
                </Command.Item>
              )}
              {kelompok.map(([namaKelompok, daftar]) => {
                const tampil = daftar.filter(cocok)
                if (tampil.length === 0) return null
                return (
                  <Command.Group
                    key={namaKelompok}
                    heading={namaKelompok || undefined}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-ket [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted"
                  >
                    {tampil.map((p) => (
                      <Command.Item key={String(p.nilai)} value={`${namaKelompok}-${p.nilai}`} onSelect={() => pilih(p.nilai)} className={cn(kelasItem, p.nilai === nilai && kelasTerpilih)}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.label}</span>
                          {p.keterangan && <span className="block truncate text-ket text-muted">{p.keterangan}</span>}
                        </span>
                        {p.nilai === nilai && <Check className="size-6 shrink-0 text-primary" strokeWidth={3} />}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )
              })}
            </Command.List>
          </Command>
          <div className="border-t border-border bg-bg px-4 py-3">
            <DialogPrimitive.Close asChild>
              <button type="button" className="flex min-h-sentuh w-full items-center justify-center rounded-input border-2 border-border-kuat bg-input text-form font-semibold text-text hover:bg-bg">
                Batal
              </button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

const kelasItem =
  'mb-1.5 flex min-h-aksi cursor-pointer select-none items-center gap-3 rounded-input border-2 border-border bg-surface px-4 text-form outline-none data-[selected=true]:border-primary data-[selected=true]:bg-primary-soft aria-selected:border-primary aria-selected:bg-primary-soft data-[disabled=true]:opacity-50'
const kelasTerpilih = 'border-primary bg-primary-soft text-primary'

