'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { aturPenguncian } from '@/server/actions/pengaturan'
import type { Pengaturan } from '@/server/db/schema'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { Label } from '@/components/ui/label'

/** Penguncian periode (docs/02 §5.5): pagar terhadap kekeliruan, bisa dibuka sendiri. */
export function KartuPenguncian({ p }: { p: Pengaturan }) {
  const router = useRouter()
  const [sampai, setSampai] = React.useState(p.terkunciSampai ?? '')
  const [sedangKirim, mulai] = React.useTransition()

  function atur(nilai: string | null) {
    mulai(async () => {
      const hasil = await aturPenguncian(nilai)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(nilai ? `Pembukuan sampai ${formatTanggal(nilai)} ditutup.` : 'Penguncian dibuka.')
      router.refresh()
    })
  }

  return (
    <Kartu judul="Tutup Pembukuan" keterangan="Setelah ditutup, catatan sampai tanggal itu tidak bisa dibuat, diubah, atau dihapus — pagar terhadap salah sentuh setelah laporan disahkan.">
      {p.terkunciSampai ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-isi">
            <Lock className="size-5 text-warning" />
            Pembukuan sampai <span className="font-bold">{formatTanggal(p.terkunciSampai)}</span> sudah ditutup.
          </p>
          <Button variant="sekunder" onClick={() => atur(null)} disabled={sedangKirim}>
            <LockOpen /> Buka Penguncian
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="kunci-sampai">Tutup pembukuan sampai tanggal</Label>
            <PilihTanggal id="kunci-sampai" className="sm:w-80" nilai={sampai} maks={hariIni()} onUbah={setSampai} />
          </div>
          <Button onClick={() => sampai && atur(sampai)} disabled={sedangKirim || !sampai}>
            <Lock /> Tutup Pembukuan
          </Button>
        </div>
      )}
    </Kartu>
  )
}
