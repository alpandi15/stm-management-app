import type { TitikLaporan } from '@/server/services/laporan-rumus'
import type { RincianJenis } from '@/server/services/laporan-rumus'
import { deretSaldo, rupiahRingkas, satuanDariKunci, skalaY } from '@/lib/grafik'
import { formatRupiah } from '@/lib/rupiah'

/**
 * Grafik untuk dokumen cetak — SVG polos tanpa JavaScript (docs/02 §7).
 * Recharts sengaja tidak dipakai di sini: halaman cetak dicetak/di-PDF segera setelah dimuat,
 * dan grafik yang butuh pengukuran DOM bisa tercetak kosong. SVG ini selalu sama hasilnya.
 */

const WARNA = { masuk: '#047857', keluar: '#b91c1c', garis: '#d1d5db', sumbu: '#9ca3af', teks: '#374151', saldo: '#1d4ed8', saldoIsi: '#dbeafe' }

function Kosong({ judul }: { judul: string }) {
  return (
    <section className="grafik-cetak" style={{ marginTop: '14pt' }}>
      <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>{judul}</h2>
      <p style={{ margin: 0, color: '#6b7280' }}>Tidak ada catatan pada rentang ini.</p>
    </section>
  )
}

/** Batang masuk vs keluar per hari/bulan. */
export function GrafikArusKasCetak({ deret }: { deret: TitikLaporan[] }) {
  if (deret.length === 0 || deret.every((d) => d.masuk === 0 && d.keluar === 0)) return <Kosong judul="Grafik Arus Kas" />

  const W = 520
  const H = 190
  const kiri = 64
  const bawah = 26
  const atas = 10
  const lebarPlot = W - kiri - 8
  const tinggiPlot = H - bawah - atas
  const { maks, garis } = skalaY(Math.max(...deret.map((d) => Math.max(d.masuk, d.keluar))))
  const lebarSlot = lebarPlot / deret.length
  const lebarBatang = Math.min(12, Math.max(2, (lebarSlot - 4) / 2))
  const y = (v: number) => atas + tinggiPlot - (v / maks) * tinggiPlot
  // Label sumbu X dijarangkan supaya tidak bertumpuk
  const lompat = Math.max(1, Math.ceil(deret.length / 10))

  return (
    <section className="grafik-cetak" style={{ marginTop: '14pt' }}>
      <h2 style={{ fontSize: '12pt', margin: '0 0 2pt' }}>Grafik Arus Kas</h2>
      <p style={{ margin: '0 0 4pt', fontSize: '9pt', color: '#6b7280' }}>
        Uang masuk dan uang keluar per {satuanDariKunci(deret[0]?.kunci)}. Sumbu tegak dalam rupiah.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Grafik batang uang masuk dan uang keluar per periode">
        {garis.map((v) => (
          <g key={v}>
            <line x1={kiri} x2={W - 8} y1={y(v)} y2={y(v)} stroke={WARNA.garis} strokeWidth={0.6} />
            <text x={kiri - 6} y={y(v) + 3} textAnchor="end" fontSize={8} fill={WARNA.teks}>
              {rupiahRingkas(v)}
            </text>
          </g>
        ))}
        {deret.map((d, i) => {
          const x0 = kiri + i * lebarSlot + lebarSlot / 2
          return (
            <g key={d.kunci}>
              {d.masuk > 0 && <rect x={x0 - lebarBatang - 1} y={y(d.masuk)} width={lebarBatang} height={Math.max(1, y(0) - y(d.masuk))} fill={WARNA.masuk} />}
              {d.keluar > 0 && <rect x={x0 + 1} y={y(d.keluar)} width={lebarBatang} height={Math.max(1, y(0) - y(d.keluar))} fill={WARNA.keluar} />}
              {i % lompat === 0 && (
                <text x={x0} y={H - 10} textAnchor="middle" fontSize={8} fill={WARNA.teks}>
                  {d.label.replace(/ \d{4}$/, '')}
                </text>
              )}
            </g>
          )
        })}
        <line x1={kiri} x2={W - 8} y1={y(0)} y2={y(0)} stroke={WARNA.sumbu} strokeWidth={0.8} />
      </svg>
      <p style={{ margin: '2pt 0 0', fontSize: '9pt' }}>
        <span style={{ display: 'inline-block', width: 9, height: 9, background: WARNA.masuk, marginRight: 4 }} /> Uang Masuk
        <span style={{ display: 'inline-block', width: 9, height: 9, background: WARNA.keluar, margin: '0 4px 0 14px' }} /> Uang Keluar
      </p>
    </section>
  )
}

/** Saldo berjalan: luas area dari sisa kas awal. */
export function GrafikSaldoCetak({ deret, sisaAwal }: { deret: TitikLaporan[]; sisaAwal: number }) {
  if (deret.length === 0) return null
  const titik = deretSaldo(deret, sisaAwal)

  const W = 520
  const H = 170
  const kiri = 64
  const bawah = 26
  const atas = 10
  const lebarPlot = W - kiri - 8
  const tinggiPlot = H - bawah - atas
  const nilai = [sisaAwal, ...titik.map((t) => t.saldo)]
  const { maks, garis } = skalaY(Math.max(...nilai, 1))
  const dx = titik.length > 1 ? lebarPlot / (titik.length - 1) : 0
  const y = (v: number) => atas + tinggiPlot - (Math.max(0, v) / maks) * tinggiPlot
  const x = (i: number) => kiri + (titik.length > 1 ? i * dx : lebarPlot / 2)
  const jalur = titik.map((t, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(t.saldo).toFixed(1)}`).join(' ')
  const isi = `${jalur} L ${x(titik.length - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`
  const lompat = Math.max(1, Math.ceil(titik.length / 10))
  const akhir = titik[titik.length - 1]

  return (
    <section className="grafik-cetak" style={{ marginTop: '12pt' }}>
      <h2 style={{ fontSize: '12pt', margin: '0 0 2pt' }}>Grafik Saldo Berjalan</h2>
      <p style={{ margin: '0 0 4pt', fontSize: '9pt', color: '#6b7280' }}>
        Sisa kas setelah setiap periode, dimulai dari sisa kas awal {formatRupiah(sisaAwal)}.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Grafik garis sisa kas dari waktu ke waktu">
        {garis.map((v) => (
          <g key={v}>
            <line x1={kiri} x2={W - 8} y1={y(v)} y2={y(v)} stroke={WARNA.garis} strokeWidth={0.6} />
            <text x={kiri - 6} y={y(v) + 3} textAnchor="end" fontSize={8} fill={WARNA.teks}>
              {rupiahRingkas(v)}
            </text>
          </g>
        ))}
        <path d={isi} fill={WARNA.saldoIsi} />
        <path d={jalur} fill="none" stroke={WARNA.saldo} strokeWidth={1.6} strokeLinejoin="round" />
        {titik.map((t, i) =>
          // Label terakhir selalu ditulis; label biasa yang jaraknya < 48px dari ujung dilewati
          i === titik.length - 1 || (i % lompat === 0 && (titik.length - 1 - i) * dx >= 48) ? (
            <text key={t.kunci} x={x(i)} y={H - 10} textAnchor={i === titik.length - 1 ? 'end' : 'middle'} fontSize={8} fill={WARNA.teks}>
              {t.label.replace(/ \d{4}$/, '')}
            </text>
          ) : null,
        )}
        <circle cx={x(titik.length - 1)} cy={y(akhir.saldo)} r={2.6} fill={WARNA.saldo} />
        <line x1={kiri} x2={W - 8} y1={y(0)} y2={y(0)} stroke={WARNA.sumbu} strokeWidth={0.8} />
      </svg>
      <p style={{ margin: '2pt 0 0', fontSize: '9pt' }}>
        Sisa kas akhir: <strong>{formatRupiah(akhir.saldo)}</strong>
      </p>
    </section>
  )
}

/** Komposisi per jenis: batang mendatar, terbesar di atas, langsung berlabel nominal. */
export function GrafikJenisCetak({ judul, baris, arah }: { judul: string; baris: RincianJenis[]; arah: 'masuk' | 'keluar' }) {
  if (baris.length === 0) return null
  const tampil = baris.slice(0, 8)
  const maks = Math.max(...tampil.map((b) => b.total))
  const warna = arah === 'masuk' ? WARNA.masuk : WARNA.keluar
  const tinggiBaris = 17
  const W = 520
  const H = tampil.length * tinggiBaris + 6
  const kiri = 150
  const lebarPlot = W - kiri - 92

  return (
    <section className="grafik-cetak" style={{ marginTop: '12pt' }}>
      <h2 style={{ fontSize: '12pt', margin: '0 0 4pt' }}>{judul}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={judul}>
        {tampil.map((b, i) => {
          const yb = i * tinggiBaris + 3
          const lebar = Math.max(1.5, (b.total / maks) * lebarPlot)
          return (
            <g key={b.jenisId}>
              <text x={kiri - 6} y={yb + 9} textAnchor="end" fontSize={8.5} fill={WARNA.teks}>
                {b.nama.length > 28 ? `${b.nama.slice(0, 27)}…` : b.nama}
              </text>
              <rect x={kiri} y={yb} width={lebar} height={11} fill={warna} rx={1.5} />
              <text x={kiri + lebar + 5} y={yb + 9} fontSize={8.5} fill={WARNA.teks}>
                {formatRupiah(b.total)} · {b.persen}%
              </text>
            </g>
          )
        })}
      </svg>
      {baris.length > tampil.length && (
        <p style={{ margin: '2pt 0 0', fontSize: '9pt', color: '#6b7280' }}>
          Menampilkan 8 jenis terbesar dari {baris.length}; rinciannya lengkap pada tabel di atas.
        </p>
      )}
    </section>
  )
}
