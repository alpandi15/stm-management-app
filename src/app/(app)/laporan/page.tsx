import { wajibSesi } from '@/server/auth/session'
import { susunLaporan } from '@/server/services/laporan'
import { daftarCatatan, daftarJenisAktif, daftarPenyetor } from '@/server/queries/transaksi'
import { bacaUrut, bacaPerHalaman } from '@/lib/urut-catatan'
import { RekapPenyetor } from '@/components/laporan/RekapPenyetor'
import { bacaParameterLaporan } from '@/server/queries/laporan'
import { kalimatRentang } from '@/lib/tanggal'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KartuAngka } from '@/components/laporan/KartuAngka'
import { RincianJenis } from '@/components/laporan/RincianJenis'
import { GrafikLaporan } from '@/components/laporan/GrafikLaporan'
import { PanelRentang } from '@/components/laporan/PanelRentang'
import { TabelCatatan } from '@/components/keuangan/TabelCatatan'
import { MenuCetak } from '@/components/laporan/MenuCetak'

export const dynamic = 'force-dynamic'

export default async function HalamanLaporan({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  await wajibSesi()
  const { periode, acuan, rentang, jenisId, metode, penyetor } = bacaParameterLaporan(searchParams)
  const penyaring = { jenisId, metode, penyetor }

  const laporan = susunLaporan(rentang, penyaring)
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  const urut = bacaUrut(searchParams.urut)
  const perHalaman = bacaPerHalaman(searchParams.n)
  const { baris, total } = daftarCatatan({ rentang, jenisId, penyetor }, halaman, urut, perHalaman)
  const daftarJenis = daftarJenisAktif()
  const r = laporan.ringkasan

  return (
    <div className="flex flex-col gap-5">
      <JudulHalaman aksi={<MenuCetak />}>Laporan</JudulHalaman>

      <PanelRentang
        periode={periode}
        acuan={acuan}
        awal={rentang.awal}
        akhir={rentang.akhir}
        jenisId={jenisId ? String(jenisId) : ''}
        metode={metode ?? ''}
        penyetor={penyetor === 'bendahara' ? 'bendahara' : penyetor ? String(penyetor) : ''}
        daftarJenis={daftarJenis}
        daftarPenyetor={daftarPenyetor()}
      />

      <p className="text-isi text-muted">
        Menampilkan <span className="font-bold text-text">{kalimatRentang(rentang)}</span>
      </p>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Ringkasan">
        <KartuAngka label="Sisa Kas Awal" nilai={r.sisaAwal} warna="otomatis" />
        <KartuAngka label="Uang Masuk" nilai={r.masuk} warna="masuk" />
        <KartuAngka label="Uang Keluar" nilai={r.keluar} warna="keluar" />
        <KartuAngka label="Selisih" nilai={r.selisih} warna="otomatis" />
        <KartuAngka label="Sisa Kas Akhir" nilai={r.sisaAkhir} warna="otomatis" />
        <KartuAngka label="Jumlah Catatan" nilai={r.jumlahCatatan} angkaBiasa />
      </section>
      <p className="-mt-2 text-ket text-muted">
        Sisa Kas Awal dan Akhir menunjukkan uang kas sebenarnya, jadi tidak ikut disaring oleh pilihan jenis di atas.
      </p>

      <GrafikLaporan deret={laporan.deret} sisaAwal={r.sisaAwal} rentangKalimat={kalimatRentang(rentang)} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RincianJenis judul="Rincian Uang Masuk per Jenis" baris={laporan.rincianMasuk} arah="masuk" />
        <RincianJenis judul="Rincian Uang Keluar per Jenis" baris={laporan.rincianKeluar} arah="keluar" />
      </div>

      <RekapPenyetor baris={laporan.rekapPenyetor} />

      <section aria-label="Daftar Catatan" className="flex flex-col gap-3">
        <h2 className="text-judul-kartu font-semibold">Daftar Catatan</h2>
        {baris.length === 0 ? (
          <p className="text-isi text-muted">Tidak ada catatan dalam rentang ini.</p>
        ) : (
          <TabelCatatan baris={baris} urut={urut} total={total} halaman={halaman} perHalaman={perHalaman} />
        )}
      </section>
    </div>
  )
}
