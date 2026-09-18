import Link from 'next/link'
import type { RekapPenyetor as Baris } from '@/server/services/laporan-rumus'
import { formatRupiah } from '@/lib/rupiah'

/** Rekap per penyetor: siapa membawa uang berapa dalam rentang — pertanggungjawaban tim pengutip. */
export function RekapPenyetor({ baris }: { baris: Baris[] }) {
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Rekap per Penyetor">
      <h2 className="text-judul-kartu font-semibold">Rekap per Penyetor</h2>
      <p className="mt-1 text-ket text-muted">Siapa yang menyetor uang masuk / menyerahkan uang keluar dalam rentang ini. “Bendahara” berarti tanpa perantara.</p>
      {baris.length === 0 ? (
        <p className="mt-3 text-isi text-muted">Tidak ada catatan dalam rentang ini.</p>
      ) : (
        <table className="mt-4 w-full text-isi">
          <thead className="text-left text-ket font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 pr-3">Penyetor</th>
              <th className="py-2 pr-3 text-right">Catatan</th>
              <th className="py-2 pr-3 text-right">Uang Masuk</th>
              <th className="py-2 text-right">Uang Keluar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {baris.map((b) => (
              <tr key={b.penyetorId ?? 'bendahara'}>
                <td className="py-2 pr-3 font-medium">
                  <Link href={`/catatan?rentang=tahun-ini&penyetor=${b.penyetorId ?? 'bendahara'}`} className="hover:text-primary hover:underline">
                    {b.nama}
                  </Link>
                </td>
                <td className="angka py-2 pr-3 text-right">{b.jumlah}</td>
                <td className="angka py-2 pr-3 text-right text-masuk">{formatRupiah(b.masuk)}</td>
                <td className="angka py-2 text-right text-keluar">{formatRupiah(b.keluar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
