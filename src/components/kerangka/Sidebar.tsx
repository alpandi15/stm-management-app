'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MENU } from './menu'
import { cn } from '@/lib/utils'

/**
 * Sidebar kiri tetap (docs/01 §4): 240px dengan ikon + label di ≥ 1100px,
 * menciut jadi ikon saja di 768–1099px, disembunyikan di bawah 768px (diganti BilahBawah).
 */
export function Sidebar({ namaStm }: { namaStm: string }) {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col border-r border-border bg-surface md:flex min-[1100px]:w-sidebar">
      <div className="flex min-h-16 items-center border-b border-border px-3 min-[1100px]:px-5">
        <span className="hidden text-isi font-semibold leading-tight line-clamp-2 min-[1100px]:block">{namaStm}</span>
        <span className="mx-auto text-judul-kartu font-bold text-primary min-[1100px]:hidden" aria-hidden>
          {namaStm.trim().charAt(0).toUpperCase() || 'S'}
        </span>
      </div>
      <nav aria-label="Menu utama" className="flex flex-1 flex-col gap-1 p-3">
        {MENU.map(({ rute, label, Ikon }) => {
          const aktif = pathname === rute || pathname.startsWith(rute + '/')
          return (
            <Link
              key={rute}
              href={rute}
              title={label}
              aria-current={aktif ? 'page' : undefined}
              className={cn(
                'flex min-h-sentuh items-center gap-3 rounded-input px-3 text-isi font-medium transition-colors duration-150',
                'justify-center min-[1100px]:justify-start',
                aktif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-text',
              )}
            >
              <Ikon className="size-6 shrink-0" />
              <span className="hidden truncate min-[1100px]:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
