import { kalimatRentang, type Rentang } from '@/lib/tanggal'

/** Kop dokumen: nama STM, alamat, judul, kalimat rentang (docs/02 §7). */
export function Kop({ namaStm, alamat, judul, rentang }: { namaStm: string; alamat: string | null; judul: string; rentang: Rentang }) {
  return (
    <header style={{ borderBottom: '2px solid #111827', paddingBottom: '8pt', marginBottom: '14pt' }}>
      <p style={{ fontSize: '16pt', fontWeight: 700, margin: 0 }}>{namaStm}</p>
      {alamat && <p style={{ margin: '2pt 0 0', color: '#374151' }}>{alamat}</p>}
      <p style={{ fontSize: '14pt', fontWeight: 700, margin: '10pt 0 0' }}>{judul}</p>
      <p style={{ margin: '2pt 0 0' }}>Rentang tanggal: {kalimatRentang(rentang)}</p>
    </header>
  )
}
