import { formatTanggal, hariIni } from '@/lib/tanggal'

/**
 * Blok tanda tangan (docs/02 §7). Nama kosong → garis kosong,
 * jangan pernah mencetak "null" atau "undefined".
 */
export function TandaTangan({ namaBendahara, namaKetua, tempat }: { namaBendahara: string | null; namaKetua: string | null; tempat?: string | null }) {
  const Kolom = ({ jabatan, nama }: { jabatan: string; nama: string | null }) => (
    <div style={{ width: '45%', textAlign: 'center' }}>
      <p style={{ margin: 0 }}>{jabatan}</p>
      <div style={{ height: '60pt' }} />
      <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #111827', display: 'inline-block', minWidth: '160pt', paddingBottom: '2pt' }}>
        {nama && nama.trim() ? nama : ' '}
      </p>
    </div>
  )
  return (
    <section className="tanda-tangan" style={{ marginTop: '24pt' }}>
      <p style={{ textAlign: 'right', margin: '0 0 12pt' }}>
        {tempat ? `${tempat}, ` : ''}
        {formatTanggal(hariIni())}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Kolom jabatan="Ketua" nama={namaKetua} />
        <Kolom jabatan="Bendahara" nama={namaBendahara} />
      </div>
    </section>
  )
}
