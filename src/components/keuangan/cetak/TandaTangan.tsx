import { formatTanggal, hariIni } from '@/lib/tanggal'

/**
 * Blok tanda tangan (docs/02 §7). Nama kosong → garis kosong,
 * jangan pernah mencetak "null" atau "undefined".
 * Sekretaris ikut dicetak bila namanya diisi di Pengaturan; bila kosong, blok tetap
 * dua kolom seperti semula supaya lembarnya tidak berubah bagi STM yang tidak memakainya.
 */
export function TandaTangan({
  namaBendahara,
  namaKetua,
  namaSekretaris,
  tempat,
}: {
  namaBendahara: string | null
  namaKetua: string | null
  namaSekretaris?: string | null
  tempat?: string | null
}) {
  const sekretaris = namaSekretaris && namaSekretaris.trim() ? namaSekretaris.trim() : null
  const lebar = sekretaris ? '32%' : '45%'
  const Kolom = ({ jabatan, nama }: { jabatan: string; nama: string | null }) => (
    <div style={{ width: lebar, textAlign: 'center' }}>
      <p style={{ margin: 0 }}>{jabatan}</p>
      <div style={{ height: '60pt' }} />
      <p style={{ margin: 0, fontWeight: 700, borderBottom: '1px solid #111827', display: 'inline-block', minWidth: sekretaris ? '120pt' : '160pt', paddingBottom: '2pt' }}>
        {nama && nama.trim() ? nama : ' '}
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
        {sekretaris && <Kolom jabatan="Sekretaris" nama={sekretaris} />}
        <Kolom jabatan="Bendahara" nama={namaBendahara} />
      </div>
    </section>
  )
}
