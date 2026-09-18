import { notFound, redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { ambilSetoran } from '@/server/queries/setoran'
import { formatRupiah, terbilangRupiah } from '@/lib/rupiah'
import { formatPeriode, formatTanggal } from '@/lib/tanggal'
import { BilahCetak } from '@/components/keuangan/cetak/BilahCetak'
import { Toaster } from '@/components/kerangka/Toaster'
import '../../cetak.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tanda Terima Setoran — Aplikasi Kas STM' }

/** Tanda terima setoran kolektif untuk pengutip: kepala, daftar anggota, total, tanda tangan dua pihak. */
export default async function HalamanCetakSetoran({ params, searchParams }: { params: { id: string }; searchParams: { cetak?: string } }) {
  await wajibSesi()
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  const s = Number.isInteger(Number(params.id)) ? ambilSetoran(Number(params.id)) : null
  if (!s) notFound()
  const namaBerkas = `Tanda-Terima-${s.nomor}.pdf`
  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 15mm; }`}</style>
      <BilahCetak namaBerkas={namaBerkas} otomatis={searchParams.cetak !== '0'} />
      <main className="dokumen potret">
        <header style={{ borderBottom: '2px solid #111827', paddingBottom: '8pt', marginBottom: '14pt' }}>
          <p style={{ fontSize: '16pt', fontWeight: 700, margin: 0 }}>{p.namaStm}</p>
          {p.alamat && <p style={{ margin: '2pt 0 0', color: '#374151' }}>{p.alamat}</p>}
          <p style={{ fontSize: '14pt', fontWeight: 700, margin: '10pt 0 0' }}>Tanda Terima Setoran {s.nomor}</p>
        </header>
        <table style={{ marginBottom: '12pt' }}>
          <tbody>
            <tr><td style={{ width: '30%' }}>Jenis</td><td>{s.namaJenis}{s.periode ? ` — ${formatPeriode(s.periode)}` : ''}</td></tr>
            <tr><td>Tanggal setor</td><td>{formatTanggal(s.tanggal)}</td></tr>
            <tr><td>Disetor oleh</td><td>{s.namaPenyetor ?? 'Bendahara'}</td></tr>
            <tr><td>Keterangan</td><td>{s.keterangan}</td></tr>
            <tr><td>Cara bayar</td><td>{s.metode === 'tunai' ? 'Tunai' : 'Transfer'}</td></tr>
          </tbody>
        </table>
        <table style={{ fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>No</th>
              <th>Nama anggota</th>
              <th style={{ width: '22%' }}>Keterangan</th>
              <th style={{ width: '15%' }}>No. Bukti</th>
              <th className="angka" style={{ width: '18%' }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {s.catatan.map((c, i) => (
              <tr key={c.id}>
                <td className="tengah">{i + 1}</td>
                <td>{c.namaPihak ?? c.namaAnggota ?? '–'}</td>
                <td>{c.periode ? formatPeriode(c.periode) : c.keterangan}</td>
                <td className="rapat">{c.noBukti}</td>
                <td className="angka">{formatRupiah(c.jumlah)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={4}>Jumlah · {s.jumlahAnggota} anggota · {s.jumlahCatatan} catatan</td>
              <td className="angka">{formatRupiah(s.total)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ margin: '6pt 0 0', fontStyle: 'italic' }}>Terbilang: {terbilangRupiah(s.total)}</p>
        <section className="tanda-tangan" style={{ marginTop: '24pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <p style={{ margin: 0 }}>Penyetor</p>
              <div style={{ height: '60pt' }} />
              <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #111827', display: 'inline-block', minWidth: '160pt', paddingBottom: '2pt' }}>{s.namaPenyetor ?? ' '}</p>
            </div>
            <div style={{ width: '45%', textAlign: 'center' }}>
              <p style={{ margin: 0 }}>Diterima oleh Bendahara</p>
              <div style={{ height: '60pt' }} />
              <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #111827', display: 'inline-block', minWidth: '160pt', paddingBottom: '2pt' }}>{p.namaBendahara || ' '}</p>
            </div>
          </div>
        </section>
      </main>
      <Toaster />
    </>
  )
}
