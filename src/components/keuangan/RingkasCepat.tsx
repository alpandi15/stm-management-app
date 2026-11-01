import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalPendek, formatJam } from '@/lib/tanggal'
import { cn } from '@/lib/utils'

/**
 * Panel kecil di atas form catat (docs/01 §5.4): sisa kas sekarang, uang masuk/keluar bulan
 * ini, dan beberapa catatan terakhir. Tujuannya satu — bendahara tidak perlu bolak-balik ke
 * Laporan hanya untuk memastikan "tadi sudah dicatat belum" atau "kasnya tinggal berapa".
 */
export function RingkasCepat({
  sisaKas,
  bulanIni,
  terakhir,
}: {
  sisaKas: number
  bulanIni: { masuk: number; keluar: number }
  terakhir: BarisCatatan[]
}) {
  return (
    <section className="flex flex-col gap-3 rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-5" aria-label="Keadaan kas saat ini">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="flex items-center gap-2 text-ket font-semibold uppercase tracking-wide text-muted">
            <Wallet className="size-4" /> Sisa uang kas sekarang
          </p>
          <p className={cn('angka text-judul font-bold', sisaKas < 0 ? 'text-keluar' : 'text-text')}>{formatRupiah(sisaKas)}</p>
        </div>
        <dl className="flex gap-5 text-ket">
          <div>
            <dt className="text-muted">Masuk bulan ini</dt>
            <dd className="angka text-isi font-semibold text-masuk">{formatRupiah(bulanIni.masuk)}</dd>
          </div>
          <div>
            <dt className="text-muted">Keluar bulan ini</dt>
            <dd className="angka text-isi font-semibold text-keluar">{formatRupiah(bulanIni.keluar)}</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-ket font-semibold uppercase tracking-wide text-muted">Catatan terakhir</p>
          <Link href="/catatan" className="text-ket font-semibold text-primary underline-offset-4 hover:underline">
            Lihat semua
          </Link>
        </div>
        {terakhir.length === 0 ? (
          <p className="mt-2 text-isi text-muted">Belum ada catatan. Yang Anda isi di bawah ini menjadi yang pertama.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {terakhir.map((c) => {
              const masuk = c.arah === 'masuk'
              return (
                <li key={c.id} className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-badge', masuk ? 'bg-masuk-soft text-masuk' : 'bg-keluar-soft text-keluar')} aria-hidden>
                    {masuk ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-isi">
                      <span className="font-semibold">{c.namaJenis}</span>
                      {c.namaPihak && <span className="text-muted"> · {c.namaPihak}</span>}
                    </span>
                    <span className="angka block truncate text-ket text-muted">
                      {formatTanggalPendek(c.tanggal)} · dicatat {formatJam(c.dibuatPada)} · {c.noBukti}
                    </span>
                  </span>
                  <span className={cn('angka shrink-0 text-isi font-bold', masuk ? 'text-masuk' : 'text-keluar')}>
                    {masuk ? '+ ' : '− '}
                    {formatRupiah(c.jumlah)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
