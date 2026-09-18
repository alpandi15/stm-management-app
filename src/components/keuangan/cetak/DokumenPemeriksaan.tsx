import type { PemeriksaanKas, Laporan } from '@/server/services/laporan'
import type { EntriRiwayat } from '@/server/queries/riwayat'
import type { Pengaturan } from '@/server/db/schema'
import { formatRupiah } from '@/lib/rupiah'
import { formatWaktu } from '@/lib/tanggal'
import { Kop } from './Kop'
import { TandaTangan } from './TandaTangan'

const AKSI: Record<EntriRiwayat['aksi'], string> = { buat: 'Dibuat', ubah: 'Diubah', hapus: 'Dihapus', kembalikan: 'Dikembalikan' }

export function DokumenPemeriksaan({ pemeriksaan, laporan, perubahan, p }: { pemeriksaan: PemeriksaanKas; laporan: Laporan; perubahan: EntriRiwayat[]; p: Pengaturan }) {
  const r = laporan.ringkasan
  return (
    <>
      <Kop namaStm={p.namaStm} alamat={p.alamat} judul="Berita Acara Pemeriksaan Kas" rentang={laporan.rentang} />
      <section>
        <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>Posisi Kas dalam Rentang</h2>
        <table>
          <tbody>
            <tr><td style={{ width: '60%' }}>Sisa Kas Awal</td><td className="angka">{formatRupiah(r.sisaAwal)}</td></tr>
            <tr><td>Uang Masuk</td><td className="angka">{formatRupiah(r.masuk)}</td></tr>
            <tr><td>Uang Keluar</td><td className="angka">{formatRupiah(r.keluar)}</td></tr>
            <tr className="total"><td>Sisa Kas Akhir</td><td className="angka">{formatRupiah(r.sisaAkhir)}</td></tr>
          </tbody>
        </table>
      </section>
      <section style={{ marginTop: '14pt' }}>
        <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>Pemeriksaan Kas (seluruh pembukuan)</h2>
        <table>
          <tbody>
            <tr><td style={{ width: '60%' }}>Saldo Awal</td><td className="angka">{formatRupiah(pemeriksaan.saldoAwal)}</td></tr>
            <tr><td>Uang Masuk</td><td className="angka">{formatRupiah(pemeriksaan.masuk)}</td></tr>
            <tr><td>Uang Keluar</td><td className="angka">{formatRupiah(pemeriksaan.keluar)}</td></tr>
            <tr><td>Sisa Kas Seharusnya</td><td className="angka">{formatRupiah(pemeriksaan.seharusnya)}</td></tr>
            <tr><td>Hitungan dari riwayat ({pemeriksaan.jumlahLog} catatan perubahan)</td><td className="angka">{formatRupiah(pemeriksaan.sebenarnya)}</td></tr>
            <tr className="total"><td>Hasil</td><td className="angka">{pemeriksaan.cocok ? 'COCOK' : 'TIDAK COCOK'}</td></tr>
          </tbody>
        </table>
      </section>
      <section style={{ marginTop: '14pt' }}>
        <h2 style={{ fontSize: '12pt', margin: '0 0 6pt' }}>Daftar Perubahan dalam Rentang</h2>
        <table style={{ fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ width: '4%' }}>No</th>
              <th style={{ width: '16%' }}>Waktu</th>
              <th style={{ width: '11%' }}>Tindakan</th>
              <th style={{ width: '13%' }}>No. Bukti</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {perubahan.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>Tidak ada perubahan dalam rentang ini</td></tr>
            )}
            {perubahan.map((e, i) => (
              <tr key={e.id}>
                <td className="tengah">{i + 1}</td>
                <td>{formatWaktu(e.waktu)}</td>
                <td>{AKSI[e.aksi]}</td>
                <td>{e.noBukti}</td>
                <td>
                  {e.ringkasan}
                  {e.perubahan.length > 0 && (
                    <ul style={{ margin: '2pt 0 0', paddingLeft: '12pt' }}>
                      {e.perubahan.map((x) => (
                        <li key={x.label}>{x.label}: {x.sebelum} → {x.sesudah}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <TandaTangan namaBendahara={p.namaBendahara} namaKetua={p.namaKetua} />
    </>
  )
}
