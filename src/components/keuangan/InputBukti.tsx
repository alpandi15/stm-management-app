'use client'
import * as React from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Foto bukti (docs/01 §5.5, docs/02 §9): seret-lepas atau pilih berkas, dikompresi di
 * klien lewat canvas (lebar maks 1600px, kualitas 0.8) supaya folder data tetap ringan.
 */
export function InputBukti({
  buktiLama,
  onUbah,
}: {
  /** Nama berkas yang sudah tersimpan (mode ubah) */
  buktiLama?: string | null
  /** berkas baru | null = lepas foto | undefined = tidak diubah */
  onUbah: (berkas: File | null | undefined) => void
}) {
  const [pratinjau, setPratinjau] = React.useState<string | null>(buktiLama ? `/api/bukti/${buktiLama}` : null)
  const [seret, setSeret] = React.useState(false)
  const [galat, setGalat] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function terima(berkas: File | undefined) {
    setGalat(null)
    if (!berkas) return
    if (!berkas.type.startsWith('image/')) return setGalat('Berkas ini bukan gambar. Pilih foto JPG atau PNG.')
    try {
      const hasil = await kompresGambar(berkas)
      if (hasil.size > 5 * 1024 * 1024) return setGalat('Foto bukti terlalu besar. Maksimal 5 MB.')
      setPratinjau(URL.createObjectURL(hasil))
      onUbah(hasil)
    } catch {
      setGalat('Foto tidak bisa dibaca. Coba foto lain.')
    }
  }

  function lepas() {
    setPratinjau(null)
    onUbah(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      {pratinjau ? (
        <div className="flex items-center gap-4 rounded-input border border-border bg-surface p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pratinjau} alt="Pratinjau foto bukti" className="size-20 rounded-lg object-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <Button type="button" variant="sekunder" onClick={() => inputRef.current?.click()}>
              <Camera /> Ganti foto
            </Button>
            <Button type="button" variant="bahaya" onClick={lepas}>
              <Trash2 /> Lepas foto
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setSeret(true)
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault()
            setSeret(false)
            terima(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex flex-col items-center gap-3 rounded-input border-2 border-dashed p-6 text-center transition-colors duration-150',
            seret ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
          )}
        >
          <Camera className="size-8 text-muted" />
          <p className="text-isi text-muted">Seret foto ke sini, atau</p>
          <Button type="button" variant="sekunder" onClick={() => inputRef.current?.click()}>
            Pilih berkas
          </Button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Pilih foto bukti"
        onChange={(e) => terima(e.target.files?.[0])}
      />
      {galat && (
        <p role="alert" className="text-label font-medium text-keluar">
          {galat}
        </p>
      )}
    </div>
  )
}

/** Kompresi: lebar maks 1600px, JPEG kualitas 0.8. Berkas kecil dikembalikan apa adanya. */
async function kompresGambar(berkas: File): Promise<File> {
  const bitmap = await createImageBitmap(berkas)
  const skala = Math.min(1, 1600 / bitmap.width)
  if (skala === 1 && berkas.size < 400 * 1024 && berkas.type === 'image/jpeg') return berkas
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * skala)
  canvas.height = Math.round(bitmap.height * skala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  if (!blob) throw new Error('toBlob')
  return new File([blob], berkas.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}
