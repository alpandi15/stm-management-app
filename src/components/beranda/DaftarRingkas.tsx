import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalPendek } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Lima catatan terakhir di Beranda (docs/01 §5.3), tanpa menu — cukup untuk dipindai. */
export function DaftarRingkas({ baris }: { baris: BarisCatatan[] }) {
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Catatan terakhir">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-judul-kartu font-semibold">Catatan Terakhir</h2>
        <Button asChild variant="tautan">
          <Link href="/catatan">Lihat semua</Link>
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {baris.map((c) => {
          const masuk = c.arah === 'masuk'
          return (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-badge', masuk ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')} aria-hidden>
                {masuk ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.namaJenis}</p>
                <p className="angka truncate text-ket text-muted">
                  {formatTanggalPendek(c.tanggal)} · {c.keterangan}
                </p>
              </div>
              <span className={cn('angka shrink-0 font-bold', masuk ? 'text-masuk' : 'text-keluar')}>
                {masuk ? '+ ' : '− '}
                {formatRupiah(c.jumlah)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
