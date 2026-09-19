'use client'
import * as React from 'react'
import { formatAngka, parseRupiah, terbilangRupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

/**
 * Kolom jumlah uang (docs/01 §5.5): prefix Rp, pemisah ribuan otomatis saat mengetik,
 * inputMode numeric, dan terbilang di bawahnya — pencegah salah nol paling efektif.
 */
export function InputRupiah({
  id,
  nilai,
  onUbah,
  galat,
  autoFocus,
  hanyaBaca,
  petunjuk,
}: {
  id: string
  nilai: number | null
  onUbah: (n: number | null) => void
  galat?: boolean
  autoFocus?: boolean
  /** Nominal terkunci (Spec 2 §B4): tampil tapi tidak bisa diubah */
  hanyaBaca?: boolean
  petunjuk?: string
}) {
  const [teks, setTeks] = React.useState(nilai ? formatAngka(nilai) : '')

  React.useEffect(() => {
    // Sinkron bila nilai diubah dari luar (mis. form diisi ulang)
    setTeks((t) => (parseRupiah(t) === (nilai ?? 0) ? t : nilai ? formatAngka(nilai) : ''))
  }, [nilai])

  function ubah(e: React.ChangeEvent<HTMLInputElement>) {
    const angka = parseRupiah(e.target.value)
    const dibatasi = Math.min(angka, 999_999_999_999)
    setTeks(dibatasi ? formatAngka(dibatasi) : '')
    onUbah(dibatasi || null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-form font-semibold text-muted">Rp</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={teks}
          onChange={ubah}
          placeholder="0"
          readOnly={hanyaBaca}
          aria-invalid={galat || undefined}
          className={cn(
            'angka flex min-h-aksi w-full rounded-input border-2 border-border-kuat bg-input pl-14 pr-4 text-judul font-bold text-text placeholder:text-muted',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-keluar',
            hanyaBaca && 'bg-bg text-muted',
          )}
        />
      </div>
      <p className="min-h-5 text-label text-muted" aria-live="polite">
        {nilai ? terbilangRupiah(nilai) : ''}
      </p>
      {petunjuk && <p className="text-ket text-muted">{petunjuk}</p>}
    </div>
  )
}
