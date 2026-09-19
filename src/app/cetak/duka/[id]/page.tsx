import { notFound, redirect } from 'next/navigation'
import { wajibSesi } from '@/server/auth/session'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { ambilKejadian, daftarAnggotaKejadian } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal, hariIni } from '@/lib/tanggal'
import { BilahCetak } from '@/components/keuangan/cetak/BilahCetak'
import { Toaster } from '@/components/kerangka/Toaster'
import '../../cetak.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daftar Tunggakan Iuran Duka — Aplikasi Kas STM' }

/** Daftar anggota yang belum bayar iuran duka satu kejadian — dibawa pengutip, ada kolom paraf. */
export default async function HalamanCetakDuka({ params, searchParams }: { params: { id: string }; searchParams: { cetak?: string } }) {
  await wajibSesi()
  const p = ambilPengaturan()
  if (!p) redirect('/setup')
  const k = Number.isInteger(Number(params.id)) ? ambilKejadian(Number(params.id)) : null
  if (!k) notFound()
  const belum = daftarAnggotaKejadian(k.id).filter((a) => a.wajib && !a.sudahBayar)
  const namaBerkas = `Tunggakan-Duka-${k.nomor}-${k.namaAlmarhum.replace(/[^\w]+/g, '-')}.pdf`
  return (
    <>
      <style>{`@page { size: A4 portrait; margin: 15mm; }`}</style>
      <BilahCetak namaBerkas={namaBerkas} otomatis={searchParams.cetak !== '0'} />
      <main className="dokumen potret">
        <header style={{ borderBottom: '2px solid #111827', paddingBottom: '8pt', marginBottom: '14pt' }}>
          <p style={{ fontSize: '16pt', fontWeight: 700, margin: 0 }}>{p.namaStm}</p>
          {p.alamat && <p style={{ margin: '2pt 0 0', color: '#374151' }}>{p.alamat}</p>}
          <p style={{ fontSize: '14pt', fontWeight: 700, margin: '10pt 0 0' }}>Daftar Tunggakan Iuran Duka</p>
        </header>
        <table style={{ marginBottom: '12pt' }}>
          <tbody>
            <tr><td style={{ width: '30%' }}>Kejadian ke-{k.nomor}</td><td><strong>Alm. {k.namaAlmarhum}</strong>{k.hubungan && ` — ${k.hubungan}`}</td></tr>
            <tr><td>Tanggal meninggal</td><td>{formatTanggal(k.tanggalMeninggal)}</td></tr>
            <tr><td>Iuran per anggota</td><td className="angka">{formatRupiah(k.tarif)}</td></tr>
            <tr><td>Sudah bayar</td><td>{k.jumlahBayar} dari {k.jumlahWajib} anggota ({formatRupiah(k.totalTerkumpul)})</td></tr>
            <tr><td>Belum bayar</td><td><strong>{belum.length} anggota · {formatRupiah(k.totalNunggak)}</strong></td></tr>
            <tr><td>Dicetak</td><td>{formatTanggal(hariIni())}</td></tr>
          </tbody>
        </table>
        <table style={{ fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>No</th>
              <th style={{ width: '12%' }}>No. Anggota</th>
              <th>Nama</th>
              <th style={{ width: '30%' }}>Alamat</th>
              <th className="angka" style={{ width: '13%' }}>Iuran</th>
              <th style={{ width: '14%' }}>Paraf / Tgl bayar</th>
            </tr>
          </thead>
          <tbody>
            {belum.length === 0 && (
              <tr><td colSpan={6} className="tengah">Semua anggota yang wajib sudah membayar.</td></tr>
            )}
            {belum.map((a, i) => (
              <tr key={a.id}>
                <td className="tengah">{i + 1}</td>
                <td className="rapat">{a.nomor ?? '–'}</td>
                <td>{a.nama}</td>
                <td>{a.alamat ?? ''}</td>
                <td className="angka">{formatRupiah(k.tarif)}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <Toaster />
    </>
  )
}
