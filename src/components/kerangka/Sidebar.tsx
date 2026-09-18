'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MENU } from './menu'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

/**
 * Sidebar kiri tetap (docs/01 §4): 240px dengan ikon + label di laptop/desktop (≥ 1024px),
 * menciut jadi ikon saja di tablet (768–1023px), disembunyikan di bawah 768px (diganti BilahBawah).
 * Saat menciut, mengarahkan kursor (atau fokus keyboard) ke sidebar melebarkannya di atas
 * isi halaman supaya nama menunya terbaca sebelum diklik.
 */
export function Sidebar({ namaStm }: { namaStm: string }) {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-[72px] shrink-0 md:block lg:w-sidebar">
      <div
        className={cn(
          'group absolute inset-y-0 left-0 z-20 flex w-[72px] flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-150',
          // Melebar saat hover/fokus di layar tablet, selalu lebar di ≥ 1024px (kelas ditulis utuh agar terbaca Tailwind)
          'hover:w-sidebar hover:shadow-kartu focus-within:w-sidebar focus-within:shadow-kartu lg:w-sidebar lg:shadow-none',
        )}
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-border px-4">
          <Logo ukuran={40} prioritas />
          <span className="hidden min-w-0 text-isi font-semibold leading-tight line-clamp-2 group-hover:block group-focus-within:block lg:block">{namaStm}</span>
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
                  aktif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-text',
                )}
              >
                <Ikon className="size-6 shrink-0" />
                <span className="hidden truncate whitespace-nowrap group-hover:inline group-focus-within:inline lg:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
