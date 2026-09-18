'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MENU_BILAH_BAWAH } from './menu'
import { cn } from '@/lib/utils'

/** Menu bawah untuk layar < 768px (docs/01 §4). Lima item; Pengaturan ada di header. */
export function BilahBawah() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MENU_BILAH_BAWAH.map(({ rute, label, Ikon }) => {
        const aktif = pathname === rute || pathname.startsWith(rute + '/')
        return (
          <Link
            key={rute}
            href={rute}
            aria-current={aktif ? 'page' : undefined}
            className={cn(
              'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-ket font-medium tracking-tight transition-colors duration-150',
              aktif ? 'text-primary' : 'text-muted',
            )}
          >
            <Ikon className="size-6" />
            <span className="w-full truncate text-center">{label === 'Catatan Kas' ? 'Catatan' : label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
