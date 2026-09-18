'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { kembalikanCatatan } from '@/server/actions/transaksi'
import type { EntriRiwayat as Entri } from '@/server/queries/riwayat'
import { formatJam } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BADGE: Record<Entri['aksi'], { label: string; kelas: string }> = {
  buat: { label: 'Dibuat', kelas: 'bg-masuk-soft text-masuk' },
  ubah: { label: 'Diubah', kelas: 'bg-primary-soft text-primary' },
  hapus: { label: 'Dihapus', kelas: 'bg-keluar-soft text-keluar' },
  kembalikan: { label: 'Dikembalikan', kelas: 'bg-warning-soft text-warning' },
}

export function EntriRiwayat({ entri }: { entri: Entri }) {
  const router = useRouter()
  const [sedangKirim, mulai] = React.useTransition()
  const badge = BADGE[entri.aksi]

  function kembalikan() {
    if (!entri.transaksiId) return
    mulai(async () => {
      const hasil = await kembalikanCatatan(entri.transaksiId!)
      if (!hasil.ok) {
        toast.error(hasil.pesan)
        return
      }
      toast.success(`Catatan ${hasil.data.noBukti} dikembalikan.`)
      router.refresh()
    })
  }

  return (
    <li className="relative flex gap-4 pl-6">
      <span className="absolute -left-[15px] top-4 size-3 rounded-full border-2 border-primary bg-surface" aria-hidden />
      <div className="min-w-0 flex-1 rounded-kartu border border-border bg-surface p-4 shadow-kartu">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="angka text-ket text-muted">{formatJam(entri.waktu)}</span>
          <span className={cn('rounded-badge px-3 py-0.5 text-ket font-semibold', badge.kelas)}>{badge.label}</span>
          <span className="angka font-semibold">{entri.noBukti}</span>
        </div>
        <p className="mt-1 text-isi">{entri.ringkasan}</p>

        {entri.aksi === 'ubah' && (
          <details className="group mt-2">
            <summary className="flex min-h-sentuh cursor-pointer list-none items-center gap-2 text-label font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-5 transition-transform duration-150 group-open:rotate-180" />
              {entri.perubahan.length ? `Lihat ${entri.perubahan.length} perubahan` : 'Tidak ada isi yang berubah'}
            </summary>
            {entri.perubahan.length > 0 && (
              <table className="mt-1 w-full text-isi">
                <thead className="sr-only">
                  <tr>
                    <th>Bagian</th>
                    <th>Sebelum</th>
                    <th>Sesudah</th>
                  </tr>
                </thead>
                <tbody>
                  {entri.perubahan.map((p) => (
                    <tr key={p.label} className="border-t border-border">
                      <td className="py-2 pr-3 align-top text-muted">{p.label}</td>
                      <td className="py-2 pr-3 align-top">
                        <span className="text-keluar line-through">{p.sebelum}</span>
                        <span className="mx-2 text-muted">→</span>
                        <span className="font-semibold text-masuk">{p.sesudah}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>
        )}

        {entri.bisaDikembalikan && (
          <Button variant="sekunder" className="mt-3" onClick={kembalikan} disabled={sedangKirim}>
            <RotateCcw /> {sedangKirim ? 'Mengembalikan…' : 'Kembalikan'}
          </Button>
        )}
      </div>
    </li>
  )
}
