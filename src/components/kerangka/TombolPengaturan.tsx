'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Ikon Pengaturan di header untuk layar < 768px (bilah bawah hanya memuat lima item). */
export function TombolPengaturan() {
  const aktif = usePathname().startsWith('/pengaturan')
  return (
    <Link
      href="/pengaturan"
      aria-label="Pengaturan"
      aria-current={aktif ? 'page' : undefined}
      className={cn(
        'flex size-sentuh items-center justify-center rounded-input transition-colors duration-150 md:hidden',
        aktif ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-text',
      )}
    >
      <Settings className="size-6" />
    </Link>
  )
}
