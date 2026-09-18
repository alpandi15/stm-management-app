import Link from 'next/link'
import { Plus } from 'lucide-react'
import { wajibSesi } from '@/server/auth/session'
import { daftarSetoran, PER_HALAMAN_SETORAN } from '@/server/queries/setoran'
import { formatRupiah } from '@/lib/rupiah'
import { formatPeriode, formatTanggalPendek } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { JudulHalaman } from '@/components/ui/judul-halaman'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { TautanCatatanSetoran } from '@/components/setoran/TautanCatatanSetoran'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HalamanDaftarSetoran({ searchParams }: { searchParams: { hal?: string } }) {
  await wajibSesi()
  const halaman = Math.max(1, Number(searchParams.hal) || 1)
  const { baris, total } = daftarSetoran(halaman)
  const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN_SETORAN))
  return (
    <div className="flex flex-col gap-5">
      <JudulHalaman
        aksi={
          <Button asChild ukuran="aksi">
            <Link href="/catatan/setoran/baru">
              <Plus /> Catat Iuran Kolektif
            </Link>
          </Button>
        }
      >
        Setoran Kolektif
      </JudulHalaman>
      <TautanCatatanSetoran aktif="setoran" />
      {baris.length === 0 ? (
        <KeadaanKosong judul="Belum ada setoran kolektif" kalimat="Iuran yang dikutip dari banyak anggota sekaligus dicatat di sini: centang siapa yang bayar dan siapa yang menyetor." tombol={{ label: 'Catat Iuran Kolektif', href: '/catatan/setoran/baru' }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {baris.map((s) => (
            <li key={s.id}>
              <Link href={`/catatan/setoran/${s.id}`} className="flex flex-col gap-1 rounded-kartu border border-border bg-surface p-4 shadow-kartu transition-colors hover:bg-bg sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className="angka">{s.nomor}</span>
                    {s.namaJenis && ` · ${s.namaJenis}`}
                    {s.periode && <span className="text-muted"> · {formatPeriode(s.periode)}</span>}
                    {s.jumlahJenis > 1 && <span className="ml-2 rounded-badge bg-primary-soft px-2 py-0.5 text-ket text-primary">{s.jumlahJenis} jenis</span>}
                  </p>
                  <p className="truncate text-isi text-muted">{s.keterangan}</p>
                  <p className="angka text-ket text-muted">
                    {formatTanggalPendek(s.tanggal)} · disetor oleh {s.namaPenyetor ?? 'Bendahara'} · {s.jumlahAnggota} anggota · {s.jumlahCatatan} catatan
                  </p>
                </div>
                <p className="angka shrink-0 text-judul-kartu font-bold text-masuk">{formatRupiah(s.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalHalaman > 1 && (
        <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Halaman">
          <Button asChild variant="sekunder" className={cn(halaman <= 1 && 'pointer-events-none opacity-50')}>
            <Link href={`/catatan/setoran?hal=${halaman - 1}`}>Sebelumnya</Link>
          </Button>
          <span className="order-first w-full text-center text-isi text-muted sm:order-none sm:w-auto">
            Halaman {halaman} dari {totalHalaman}
          </span>
          <Button asChild variant="sekunder" className={cn(halaman >= totalHalaman && 'pointer-events-none opacity-50')}>
            <Link href={`/catatan/setoran?hal=${halaman + 1}`}>Berikutnya</Link>
          </Button>
        </nav>
      )}
    </div>
  )
}
