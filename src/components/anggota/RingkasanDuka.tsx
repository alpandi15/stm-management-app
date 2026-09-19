import Link from 'next/link'
import { Check, HeartHandshake, X } from 'lucide-react'
import type { RingkasanDukaAnggota } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Bagian "Iuran Duka" di detail anggota: ringkasan tunggakan + status tiap kejadian yang jadi kewajibannya. */
export function RingkasanDuka({ ringkasan: r }: { ringkasan: RingkasanDukaAnggota }) {
  const nunggak = r.jumlahNunggak > 0
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Iuran duka">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-judul-kartu font-semibold">Iuran Duka / Kemalangan</h2>
          <p className="mt-1 text-ket text-muted">
            {r.jumlahWajib === 0 ? 'Belum ada kejadian yang menjadi kewajibannya.' : `Wajib ${r.jumlahWajib} kejadian · sudah bayar ${r.jumlahBayar}`}
          </p>
        </div>
        <Button asChild variant="sekunder">
          <Link href="/duka">
            <HeartHandshake /> Buku Duka
          </Link>
        </Button>
      </div>
      {r.jumlahWajib > 0 && (
        <>
          <div className={cn('mt-4 flex items-center justify-between gap-3 rounded-input px-4 py-3', nunggak ? 'bg-keluar-soft text-keluar' : 'bg-masuk-soft text-masuk')}>
            <span className="text-isi font-semibold">{nunggak ? `Menunggak ${r.jumlahNunggak} kejadian` : 'Lunas semua'}</span>
            <span className="angka text-judul-kartu font-bold">{nunggak ? formatRupiah(r.totalNunggak) : 'Rp 0'}</span>
          </div>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-input border border-border">
            {r.daftar.map((k) => (
              <li key={k.id}>
                <Link href={`/duka/${k.id}`} className={cn('flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-bg', !k.sudahBayar && 'bg-keluar-soft')}>
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', k.sudahBayar ? 'bg-masuk text-primary-fg' : 'bg-keluar text-primary-fg')}>
                    {k.sudahBayar ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      <span className="angka mr-2 text-ket text-muted">#{k.nomor}</span>Alm. {k.namaAlmarhum}
                    </span>
                    <span className="block truncate text-ket text-muted">
                      {formatTanggal(k.tanggalMeninggal)}
                      {k.sudahBayar && k.tanggalBayar && ` · dibayar ${formatTanggal(k.tanggalBayar)}`}
                    </span>
                  </span>
                  <span className={cn('angka shrink-0 text-isi font-semibold', k.sudahBayar ? 'text-muted' : 'text-keluar')}>{formatRupiah(k.tarif)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
