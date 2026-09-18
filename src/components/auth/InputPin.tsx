'use client'
import { useCallback, useEffect, useState } from 'react'
import { KotakPin } from './KotakPin'
import { PapanAngka } from './PapanAngka'
import { PesanGalat } from '@/components/ui/pesan-galat'

/**
 * Enam kotak + papan angka + dukungan keyboard. Begitu digit keenam terisi,
 * `onSelesai(pin)` dipanggil — tanpa tombol "Masuk" (docs/01 §5.2).
 * Komponen ini tidak menyimpan PIN lebih lama dari yang diperlukan.
 */
export function InputPin({
  label,
  onSelesai,
  galat,
  nonaktif,
  kunciReset,
  otomatisFokus = true,
}: {
  label: string
  onSelesai: (pin: string) => void
  galat?: string | null
  nonaktif?: boolean
  /** Ubah nilai ini untuk mengosongkan kotak dari luar (mis. setelah PIN salah). */
  kunciReset?: number
  otomatisFokus?: boolean
}) {
  const [pin, setPin] = useState('')
  const [getar, setGetar] = useState(false)

  useEffect(() => {
    setPin('')
  }, [kunciReset])

  useEffect(() => {
    if (!galat) return
    setGetar(true)
    const t = setTimeout(() => setGetar(false), 350)
    return () => clearTimeout(t)
  }, [galat, kunciReset])

  const tambah = useCallback(
    (d: string) => {
      if (nonaktif) return
      setPin((p) => {
        if (p.length >= 6) return p
        const baru = p + d
        if (baru.length === 6) {
          // Serahkan ke pemanggil setelah render selesai
          setTimeout(() => onSelesai(baru), 0)
        }
        return baru
      })
    },
    [nonaktif, onSelesai],
  )

  const hapus = useCallback(() => setPin((p) => p.slice(0, -1)), [])

  useEffect(() => {
    if (!otomatisFokus) return
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        tambah(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        hapus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tambah, hapus, otomatisFokus])

  return (
    <div className="flex flex-col items-center gap-6">
      <KotakPin terisi={pin.length} getar={getar} label={label} />
      <div className="min-h-6 text-center">
        <PesanGalat>{galat}</PesanGalat>
      </div>
      <PapanAngka onAngka={tambah} onHapus={hapus} nonaktif={nonaktif} />
    </div>
  )
}
