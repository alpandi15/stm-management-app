'use client'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BulanGrafik } from '@/server/services/laporan-rumus'
import { formatRupiah } from '@/lib/rupiah'

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Legenda dengan urutan tetap dan teks berwarna teks (bukan warna seri) — pedoman dataviz. */
function LegendaTetap() {
  return (
    <ul className="mt-2 flex justify-center gap-6 text-label text-text" aria-label="Keterangan warna">
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-badge bg-grafik-masuk" aria-hidden /> Uang Masuk
      </li>
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-badge bg-grafik-keluar" aria-hidden /> Uang Keluar
      </li>
    </ul>
  )
}

/**
 * Grafik batang 12 bulan, masuk vs keluar (docs/01 §5.3). Satu sumbu Y rupiah penuh,
 * tooltip format penuh, warna mengikuti token grafik (divalidasi untuk buta warna),
 * legenda selalu ada karena dua seri, dan urutan batang tetap: masuk kiri, keluar kanan.
 */
export function GrafikBulanan({ data, tahun }: { data: BulanGrafik[]; tahun: number }) {
  const baris = data.map((d, i) => ({ ...d, nama: NAMA_BULAN[i] }))
  const kosong = baris.every((b) => b.masuk === 0 && b.keluar === 0)
  return (
    <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label={`Uang masuk dan keluar per bulan ${tahun}`}>
      <h2 className="text-judul-kartu font-semibold">Uang Masuk & Keluar {tahun}</h2>
      {kosong ? (
        <p className="mt-3 text-isi text-muted">Grafik akan terisi setelah ada catatan di tahun ini.</p>
      ) : (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={baris} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%" barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="nama" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fill: 'var(--color-muted)', fontSize: 13 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={118}
                tick={{ fill: 'var(--color-muted)', fontSize: 13 }}
                tickFormatter={(v: number) => formatRupiah(v)}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-bg)' }}
                formatter={(v) => formatRupiah(Number(v))}
                contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15 }}
                labelStyle={{ color: 'var(--color-muted)', fontWeight: 600 }}
              />
              <Legend content={<LegendaTetap />} />
              <Bar dataKey="masuk" name="Uang Masuk" fill="var(--color-grafik-masuk)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="keluar" name="Uang Keluar" fill="var(--color-grafik-keluar)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!kosong && (
        <details className="mt-3">
          <summary className="min-h-sentuh cursor-pointer text-label font-semibold text-primary">Lihat sebagai tabel</summary>
          <table className="angka mt-2 w-full text-isi">
            <thead>
              <tr className="text-left text-ket text-muted">
                <th className="py-1 font-semibold">Bulan</th>
                <th className="py-1 text-right font-semibold">Uang Masuk</th>
                <th className="py-1 text-right font-semibold">Uang Keluar</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.bulan} className="border-t border-border">
                  <td className="py-1.5">{b.nama}</td>
                  <td className="py-1.5 text-right text-masuk">{formatRupiah(b.masuk)}</td>
                  <td className="py-1.5 text-right text-keluar">{formatRupiah(b.keluar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}
