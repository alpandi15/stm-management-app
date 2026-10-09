'use client'
import * as React from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TitikLaporan } from '@/server/services/laporan-rumus'
import { deretSaldo, rupiahRingkas, satuanDariKunci } from '@/lib/grafik'
import { formatRupiah } from '@/lib/rupiah'
import { cn } from '@/lib/utils'

/** Legenda ditulis sendiri: urutan tetap dan teks berwarna teks biasa, bukan warna seri (dataviz). */
function Legenda({ item }: { item: Array<{ warna: string; label: string }> }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-5 text-label text-text" aria-label="Keterangan warna">
      {item.map((x) => (
        <li key={x.label} className="flex items-center gap-2">
          <span className={cn('size-3 rounded-badge', x.warna)} aria-hidden /> {x.label}
        </li>
      ))}
    </ul>
  )
}

const gayaTooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15 },
  labelStyle: { color: 'var(--color-muted)', fontWeight: 600 },
}

/**
 * Dua grafik untuk halaman Laporan (docs/01 §5.6):
 * 1. Arus kas — batang masuk vs keluar per hari/bulan dalam rentang yang dipilih.
 * 2. Saldo berjalan — luas area dari sisa kas awal, menunjukkan arah kas selama rentang.
 * Keduanya satu sumbu Y rupiah, tanpa sumbu ganda, dan menyediakan versi tabel.
 */
export function GrafikLaporan({ deret, sisaAwal, rentangKalimat }: { deret: TitikLaporan[]; sisaAwal: number; rentangKalimat: string }) {
  const saldo = React.useMemo(() => deretSaldo(deret, sisaAwal), [deret, sisaAwal])
  const kosong = deret.every((d) => d.masuk === 0 && d.keluar === 0)
  const satuan = satuanDariKunci(deret[0]?.kunci)
  // Label sumbu X: tahun dibuang, nama bulan dipendekkan, dan Recharts yang menjarangkan
  // sisanya lewat minTickGap — menghitung sendiri dari jumlah titik membuat label bertumpuk
  // saat lebar kolom berubah (mis. dua grafik berdampingan di layar sempit).
  const data = React.useMemo(
    () => deret.map((d) => ({ ...d, labelX: satuan === 'bulan' ? d.label.slice(0, 3) : d.label.replace(/ \d{4}$/, '') })),
    [deret, satuan],
  )
  const sumbuX = { dataKey: 'labelX', tickLine: false, interval: 'preserveStartEnd' as const, minTickGap: 14, axisLine: { stroke: 'var(--color-border)' }, tick: { fill: 'var(--color-muted)', fontSize: 12 } }

  if (kosong) {
    return (
      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Grafik laporan">
        <h2 className="text-judul-kartu font-semibold">Grafik</h2>
        <p className="mt-2 text-isi text-muted">Belum ada catatan pada {rentangKalimat}, jadi belum ada yang bisa digambar.</p>
      </section>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* 1. Arus kas */}
      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Arus kas per periode">
        <h2 className="text-judul-kartu font-semibold">Arus Kas</h2>
        <p className="mt-1 text-ket text-muted">Uang masuk dan keluar per {satuan} · {rentangKalimat}</p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }} barCategoryGap="22%" barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis {...sumbuX} />
              <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} tickFormatter={(v: number) => rupiahRingkas(v)} />
              <Tooltip cursor={{ fill: 'var(--color-bg)' }} labelFormatter={(_, isi) => isi?.[0]?.payload?.label ?? ''} formatter={(v) => formatRupiah(Number(v))} {...gayaTooltip} />
              <Bar dataKey="masuk" name="Uang Masuk" fill="var(--color-grafik-masuk)" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="keluar" name="Uang Keluar" fill="var(--color-grafik-keluar)" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Legenda item={[{ warna: 'bg-grafik-masuk', label: 'Uang Masuk' }, { warna: 'bg-grafik-keluar', label: 'Uang Keluar' }]} />
        <TabelDeret deret={saldo} />
      </section>

      {/* 2. Saldo berjalan */}
      <section className="rounded-kartu border border-border bg-surface p-6 shadow-kartu" aria-label="Saldo berjalan">
        <h2 className="text-judul-kartu font-semibold">Saldo Berjalan</h2>
        <p className="mt-1 text-ket text-muted">
          Mulai dari sisa kas awal <span className="angka font-semibold text-text">{formatRupiah(sisaAwal)}</span>
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={saldo.map((d, i) => ({ ...d, labelX: data[i].labelX }))} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="isiSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis {...sumbuX} />
              <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} tickFormatter={(v: number) => rupiahRingkas(v)} />
              <Tooltip formatter={(v) => formatRupiah(Number(v))} labelFormatter={(_, isi) => isi?.[0]?.payload?.label ?? ''} {...gayaTooltip} />
              <ReferenceLine y={0} stroke="var(--color-keluar)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="saldo" name="Sisa kas" stroke="var(--color-primary)" strokeWidth={2} fill="url(#isiSaldo)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Legenda item={[{ warna: 'bg-primary', label: 'Sisa kas' }]} />
      </section>
    </div>
  )
}

function TabelDeret({ deret }: { deret: ReturnType<typeof deretSaldo> }) {
  return (
    <details className="mt-3">
      <summary className="min-h-sentuh cursor-pointer text-label font-semibold text-primary">Lihat sebagai tabel</summary>
      <div className="max-h-64 overflow-y-auto">
        <table className="angka mt-2 w-full text-isi">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-ket text-muted">
              <th className="py-1 font-semibold">Periode</th>
              <th className="py-1 text-right font-semibold">Masuk</th>
              <th className="py-1 text-right font-semibold">Keluar</th>
              <th className="py-1 text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {deret.map((d) => (
              <tr key={d.kunci} className="border-t border-border">
                <td className="py-1.5">{d.label}</td>
                <td className="py-1.5 text-right text-masuk">{d.masuk ? formatRupiah(d.masuk) : '–'}</td>
                <td className="py-1.5 text-right text-keluar">{d.keluar ? formatRupiah(d.keluar) : '–'}</td>
                <td className="py-1.5 text-right font-semibold">{formatRupiah(d.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
