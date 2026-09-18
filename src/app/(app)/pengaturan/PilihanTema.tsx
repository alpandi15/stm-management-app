'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { aturTema } from '@/server/actions/pengaturan'
import type { Tema } from '@/server/db/schema'
import { cn } from '@/lib/utils'

const PILIHAN: ReadonlyArray<{ nilai: Tema; label: string; Ikon: typeof Sun }> = [
  { nilai: 'sistem', label: 'Ikuti komputer', Ikon: Monitor },
  { nilai: 'terang', label: 'Terang', Ikon: Sun },
  { nilai: 'gelap', label: 'Gelap', Ikon: Moon },
]

export function PilihanTema({ pilihan }: { pilihan: Tema }) {
  const router = useRouter()
  const [sedangKirim, mulaiKirim] = useTransition()

  function pilih(tema: Tema) {
    if (tema === pilihan) return
    mulaiKirim(async () => {
      const hasil = await aturTema(tema)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success('Tampilan diubah.')
      router.refresh()
    })
  }

  return (
    <div role="radiogroup" aria-label="Tampilan" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PILIHAN.map(({ nilai, label, Ikon }) => {
        const aktif = nilai === pilihan
        return (
          <button
            key={nilai}
            type="button"
            role="radio"
            aria-checked={aktif}
            disabled={sedangKirim}
            onClick={() => pilih(nilai)}
            className={cn(
              'flex min-h-aksi items-center justify-center gap-2 rounded-input border-2 px-4 text-isi font-semibold transition-colors duration-150 disabled:opacity-50',
              aktif ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text hover:bg-bg',
            )}
          >
            <Ikon className="size-5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
