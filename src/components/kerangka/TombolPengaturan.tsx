'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Tags } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Ikon Jenis Uang dan Pengaturan di header untuk layar < 768px (bilah bawah hanya memuat lima item). */
export function TombolPengaturan() {
  const pathname = usePathname()
  const tautan = (href: string, label: string, Ikon: typeof Settings) => {
    const aktif = pathname.startsWith(href)
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={aktif ? 'page' : undefined}
        className={cn(
          'flex size-sentuh items-center justify-center rounded-input transition-colors duration-150 md:hidden',
          aktif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-text',
        )}
      >
        <Ikon className="size-6" />
      </Link>
    )
  }
  return (
    <>
      {tautan('/jenis', 'Jenis Uang', Tags)}
      {tautan('/pengaturan', 'Pengaturan', Settings)}
    </>
  )
}
