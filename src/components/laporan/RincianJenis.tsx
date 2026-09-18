import type { RincianJenis as Baris } from '@/server/services/laporan-rumus'
import { formatRupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

/** Rincian per jenis: nama, nominal, bar persentase horizontal, jumlah catatan (docs/01 §5.6). */
export function RincianJenis({ judul, baris, arah }: { judul: string; baris: Baris[]; arah: 'masuk' | 'keluar' }) {
  const warnaBar = arah === 'masuk' ? 'bg-grafik-masuk' : 'bg-grafik-keluar'
  const warnaTeks = arah === 'masuk' ? 'text-masuk' : 'text-keluar'
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label={judul}>
      <h2 className="text-judul-kartu font-semibold">{judul}</h2>
      {baris.length === 0 ? (
        <p className="mt-3 text-isi text-muted">Tidak ada catatan {arah === 'masuk' ? 'uang masuk' : 'uang keluar'} dalam rentang ini.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {baris.map((b) => (
            <li key={b.jenisId}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{b.nama}</span>
                <span className={cn('angka font-bold', warnaTeks)}>{formatRupiah(b.total)}</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-badge bg-border" role="img" aria-label={`${b.persen}%`}>
                <div className={cn('h-full rounded-badge', warnaBar)} style={{ width: `${Math.max(b.persen, 1)}%` }} />
              </div>
              <p className="angka mt-1 text-ket text-muted">
                {b.persen}% · {b.jumlah} catatan
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
