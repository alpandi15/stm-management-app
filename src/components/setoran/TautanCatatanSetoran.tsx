import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Dua tombol pindah halaman di Catatan Kas: catatan satuan ↔ setoran kolektif. */
export function TautanCatatanSetoran({ aktif }: { aktif: 'catatan' | 'setoran' }) {
  const kelas = (a: boolean) =>
    cn('min-h-sentuh rounded-badge border-2 px-5 text-isi font-semibold transition-colors duration-150 inline-flex items-center', a ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text hover:bg-bg')
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/catatan" className={kelas(aktif === 'catatan')} aria-current={aktif === 'catatan' ? 'page' : undefined}>
        Semua Catatan
      </Link>
      <Link href="/catatan/setoran" className={kelas(aktif === 'setoran')} aria-current={aktif === 'setoran' ? 'page' : undefined}>
        Setoran Kolektif
      </Link>
    </div>
  )
}
