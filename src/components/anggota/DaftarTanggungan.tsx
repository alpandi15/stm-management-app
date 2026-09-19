import Link from 'next/link'
import { HeartCrack, UserRoundPlus } from 'lucide-react'
import type { BarisKeluarga } from '@/server/queries/anggota'
import { LABEL_JENIS_KELAMIN } from '@/lib/validasi'
import { formatTanggal, umurTahun } from '@/lib/tanggal'
import { cn } from '@/lib/utils'

function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean)
  return ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Daftar keluarga/tanggungan di detail anggota (Server Component): avatar inisial, hubungan, umur, status. */
export function DaftarTanggungan({ anggotaId, aktif, pecah }: { anggotaId: number; aktif: BarisKeluarga[]; pecah: BarisKeluarga[] }) {
  if (aktif.length === 0 && pecah.length === 0) {
    return (
      <p className="text-isi text-muted">
        Belum ada tanggungan.{' '}
        <Link href={`/anggota/${anggotaId}/keluarga`} className="font-semibold text-primary underline-offset-4 hover:underline">
          Tambah keluarga
        </Link>
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {aktif.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-input border border-border">
          {aktif.map((k) => {
            const meninggal = k.status === 'meninggal'
            const umur = umurTahun(k.tanggalLahir)
            const rincian = [
              k.jenisKelamin ? LABEL_JENIS_KELAMIN[k.jenisKelamin] : null,
              umur != null ? `${umur} tahun` : k.tanggalLahir ? `lahir ${formatTanggal(k.tanggalLahir)}` : null,
            ].filter(Boolean)
            return (
              <li key={k.id} className={cn('flex items-center gap-3 px-4 py-3', meninggal ? 'bg-bg' : 'bg-surface')}>
                <span
                  aria-hidden
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-ket font-bold',
                    meninggal ? 'bg-keluar-soft text-keluar' : k.jenisKelamin === 'P' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary',
                  )}
                >
                  {meninggal ? <HeartCrack className="size-5" /> : inisial(k.nama)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-semibold', meninggal && 'text-muted')}>
                    {meninggal && <span className="mr-1 font-normal">Alm.</span>}
                    {k.nama}
                  </p>
                  <p className="truncate text-ket text-muted">
                    {rincian.join(' · ')}
                    {k.keterangan && ` · ${k.keterangan}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-badge bg-bg px-2.5 py-0.5 text-ket font-semibold text-text">{k.hubungan}</span>
                  {meninggal && (
                    <span className="rounded-badge bg-keluar-soft px-2.5 py-0.5 text-ket font-semibold text-keluar">
                      Meninggal{k.tanggalMeninggal && ` · ${formatTanggal(k.tanggalMeninggal)}`}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {pecah.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label font-semibold uppercase tracking-wide text-muted">Sudah jadi anggota sendiri</p>
          <ul className="flex flex-wrap gap-2">
            {pecah.map((k) => (
              <li key={k.id}>
                <Link
                  href={k.pindahKeAnggotaId ? `/anggota/${k.pindahKeAnggotaId}` : `/anggota/${anggotaId}/keluarga`}
                  className="inline-flex items-center gap-2 rounded-badge border border-border bg-surface px-3 py-1 text-ket font-semibold text-primary hover:bg-primary-soft"
                >
                  <UserRoundPlus className="size-4" /> {k.nama} <span className="font-normal text-muted">· {k.hubungan}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
