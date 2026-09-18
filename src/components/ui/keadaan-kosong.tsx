import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Keadaan kosong (docs/01 P8): gambar sederhana, satu kalimat, satu tombol untuk melangkah.
 * Tidak ada jalan buntu.
 */
export function KeadaanKosong({
  judul,
  kalimat,
  tombol,
}: {
  judul: string
  kalimat: string
  tombol?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center rounded-kartu border border-border bg-surface px-6 py-12 text-center shadow-kartu">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden className="text-primary">
        <rect x="18" y="14" width="60" height="68" rx="10" className="fill-primary-soft" />
        <rect x="18" y="14" width="60" height="68" rx="10" stroke="currentColor" strokeWidth="3" />
        <path d="M32 36h32M32 48h32M32 60h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h2 className="mt-5 text-judul-kartu font-semibold">{judul}</h2>
      <p className="mt-2 max-w-md text-isi text-muted">{kalimat}</p>
      {tombol && (
        <Button asChild ukuran="aksi" className="mt-6">
          <Link href={tombol.href}>{tombol.label}</Link>
        </Button>
      )}
    </div>
  )
}
