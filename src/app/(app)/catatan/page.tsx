import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { daftarCatatan, daftarJenisAktif, daftarPenyetor, ringkasanCatatan, type FilterCatatan } from '@/server/queries/transaksi'
import { hitungSisaKas } from '@/server/services/laporan'
import { apakahPilihanRentang, kalimatRentang, tentukanRentang, type PilihanRentang } from '@/lib/tanggal'
import { formatRupiah } from '@/lib/rupiah'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { BarisFilter } from '@/components/keuangan/BarisFilter'
import { TabelCatatan } from '@/components/keuangan/TabelCatatan'
import { bacaUrut, bacaPerHalaman } from '@/lib/urut-catatan'
import { BannerKasMinus } from '@/components/keuangan/BannerKasMinus'
import { TautanCatatanSetoran } from '@/components/setoran/TautanCatatanSetoran'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Params = Record<string, string | string[] | undefined>
const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function HalamanCatatan({ searchParams }: { searchParams: Params }) {
  await wajibSesi()

  const rentangParam = satu(searchParams.rentang)
  const rentangPilihan: PilihanRentang = apakahPilihanRentang(rentangParam) ? rentangParam : 'bulan-ini'
  const arah = satu(searchParams.arah)
  const jenisParam = satu(searchParams.jenis)
  const cari = satu(searchParams.cari)
  const penyetorParam = satu(searchParams.penyetor)
  const halaman = Math.max(1, Number(satu(searchParams.hal)) || 1)
  const urut = bacaUrut(satu(searchParams.urut))
  const perHalaman = bacaPerHalaman(satu(searchParams.n))
  const rentang = tentukanRentang(rentangPilihan, satu(searchParams.awal), satu(searchParams.akhir))

  const filter: FilterCatatan = {
    rentang,
    arah: arah === 'masuk' || arah === 'keluar' ? arah : undefined,
    jenisId: Number(jenisParam) || undefined,
    cari: cari || undefined,
    penyetor: penyetorParam === 'bendahara' ? 'bendahara' : Number(penyetorParam) || undefined,
  }

  const daftarJenis = daftarJenisAktif()
  const { baris, total } = daftarCatatan(filter, halaman, urut, perHalaman)
  const ringkasan = ringkasanCatatan(filter)
  const sisaKas = hitungSisaKas()
  const adaPenyaring = !!(filter.arah || filter.jenisId || filter.cari || filter.penyetor)

  return (
    <div className="flex flex-col gap-5">
      <JudulHalaman
        aksi={
          <div className="hidden gap-2 sm:flex">
            <Button asChild variant="sekunder" ukuran="aksi">
              <Link href="/catatan/setoran/baru">
                <Users /> Catat Iuran Kolektif
              </Link>
            </Button>
            <Button asChild ukuran="aksi">
              <Link href="/catatan/baru">
                <Plus /> Catat
              </Link>
            </Button>
          </div>
        }
      >
        Catatan Kas
      </JudulHalaman>

      <TautanCatatanSetoran aktif="catatan" />
      <BannerKasMinus sisaKas={sisaKas} />

      <BarisFilter
        daftarJenis={daftarJenis}
        daftarPenyetor={daftarPenyetor()}
        penyetor={penyetorParam}
        rentang={rentangPilihan}
        awal={rentang.awal}
        akhir={rentang.akhir}
        arah={filter.arah ?? ''}
        jenisId={filter.jenisId ? String(filter.jenisId) : ''}
        cari={filter.cari ?? ''}
      />

      <p className="text-isi text-muted">
        Menampilkan <span className="font-semibold text-text">{kalimatRentang(rentang)}</span>
        {total > 0 && ` · ${total} catatan`}
      </p>

      {/* Ringkasan hasil penyaringan — dihitung di server dari seluruh hasil, bukan halaman ini */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Ringkasan">
        <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu">
          <p className="text-ket text-muted">Uang Masuk</p>
          <p className="angka mt-1 text-judul-kartu font-bold text-masuk">{formatRupiah(ringkasan.masuk)}</p>
        </div>
        <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu">
          <p className="text-ket text-muted">Uang Keluar</p>
          <p className="angka mt-1 text-judul-kartu font-bold text-keluar">{formatRupiah(ringkasan.keluar)}</p>
        </div>
        <div className="rounded-kartu border border-border bg-surface p-4 shadow-kartu">
          <p className="text-ket text-muted">Selisih</p>
          <p className={cn('angka mt-1 text-judul-kartu font-bold', ringkasan.selisih < 0 ? 'text-keluar' : 'text-text')}>{formatRupiah(ringkasan.selisih)}</p>
        </div>
      </section>


      {baris.length === 0 ? (
        <KeadaanKosong
          judul={adaPenyaring || rentangPilihan !== 'bulan-ini' ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan bulan ini'}
          kalimat={
            adaPenyaring || rentangPilihan !== 'bulan-ini'
              ? 'Coba ubah rentang tanggal atau pilihan di atas.'
              : 'Setiap uang yang masuk dan keluar dicatat di sini. Mulai dengan mencatat yang pertama.'
          }
          tombol={{ label: 'Catat Uang Masuk', href: '/catatan/baru?jenis=masuk' }}
        />
      ) : (
        <TabelCatatan baris={baris} urut={urut} total={total} halaman={halaman} perHalaman={perHalaman} />
      )}

      {/* Tombol mengambang di layar sempit (docs/01 §5.4) */}
      <Button asChild ukuran="aksi" className="fixed bottom-20 right-4 z-20 rounded-badge px-5 shadow-kartu sm:hidden">
        <Link href="/catatan/baru" aria-label="Catat uang masuk atau keluar">
          <Plus /> Catat
        </Link>
      </Button>
    </div>
  )
}
