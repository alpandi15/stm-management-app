import type { Laporan } from '@/server/services/laporan'
import type { Pengaturan } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { Kop } from './Kop'
import { TandaTangan } from './TandaTangan'

export function DokumenRingkas({ laporan, p }: { laporan: Laporan; p: Pengaturan }) {
  const r = laporan.ringkasan
  const Rincian = ({ judul, baris }: { judul: string; baris: Laporan['rincianMasuk'] }) => (
    <section style={{ marginTop: '14pt' }}>
      <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>{judul}</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: '6%' }}>No</th>
            <th>Jenis</th>
            <th className="angka" style={{ width: '24%' }}>Jumlah (Rp)</th>
            <th className="angka" style={{ width: '12%' }}>%</th>
            <th className="angka" style={{ width: '14%' }}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>Tidak ada</td>
            </tr>
          )}
          {baris.map((b, i) => (
            <tr key={b.jenisId}>
              <td className="tengah">{i + 1}</td>
              <td>{b.nama}</td>
              <td className="angka">{formatRupiah(b.total)}</td>
              <td className="angka">{b.persen}%</td>
              <td className="angka">{b.jumlah}</td>
            </tr>
          ))}
          <tr className="total">
            <td colSpan={2}>Jumlah</td>
            <td className="angka">{formatRupiah(baris.reduce((a, b) => a + b.total, 0))}</td>
            <td className="angka">{baris.length ? '100%' : '0%'}</td>
            <td className="angka">{baris.reduce((a, b) => a + b.jumlah, 0)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
  return (
    <>
      <Kop namaStm={p.namaStm} alamat={p.alamat} judul="Laporan Ringkas Kas" rentang={laporan.rentang} />
      <section>
        <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>Ringkasan</h2>
        <table>
          <tbody>
            {(
              [
                ['Sisa Kas Awal', r.sisaAwal],
                ['Uang Masuk', r.masuk],
                ['Uang Keluar', r.keluar],
                ['Selisih', r.selisih],
                ['Sisa Kas Akhir', r.sisaAkhir],
              ] as const
            ).map(([label, nilai]) => (
              <tr key={label} className={label === 'Sisa Kas Akhir' ? 'total' : undefined}>
                <td style={{ width: '60%' }}>{label}</td>
                <td className="angka">{formatRupiah(nilai)}</td>
              </tr>
            ))}
            <tr>
              <td>Jumlah Catatan</td>
              <td className="angka">{r.jumlahCatatan}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <Rincian judul="Rincian Uang Masuk per Jenis" baris={laporan.rincianMasuk} />
      <Rincian judul="Rincian Uang Keluar per Jenis" baris={laporan.rincianKeluar} />
      <section style={{ marginTop: '14pt' }}>
        <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>Rekap per Penyetor</h2>
        <table>
          <thead>
            <tr>
              <th>Penyetor</th>
              <th className="angka" style={{ width: '12%' }}>Catatan</th>
              <th className="angka" style={{ width: '24%' }}>Uang Masuk</th>
              <th className="angka" style={{ width: '24%' }}>Uang Keluar</th>
            </tr>
          </thead>
          <tbody>
            {laporan.rekapPenyetor.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>Tidak ada</td>
              </tr>
            )}
            {laporan.rekapPenyetor.map((b) => (
              <tr key={b.penyetorId ?? 'bendahara'}>
                <td>{b.nama}</td>
                <td className="angka">{b.jumlah}</td>
                <td className="angka">{formatRupiah(b.masuk)}</td>
                <td className="angka">{formatRupiah(b.keluar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <TandaTangan namaBendahara={p.namaBendahara} namaKetua={p.namaKetua} />
    </>
  )
}
