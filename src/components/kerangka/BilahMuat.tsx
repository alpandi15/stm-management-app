'use client'
import * as React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Bilah tipis di tepi atas yang berjalan saat pindah halaman (docs/01 §4). App Router tidak
 * punya peristiwa "mulai navigasi", jadi bilah dinyalakan saat tautan internal diklik dan
 * dimatikan begitu pathname/query berubah. Komputer tua Windows 7 bisa butuh 1–2 detik per
 * halaman; tanpa ini pengguna mengira kliknya tidak masuk.
 */
export function BilahMuat() {
  const pathname = usePathname()
  const cari = useSearchParams()
  const [aktif, setAktif] = React.useState(false)

  React.useEffect(() => {
    setAktif(false)
  }, [pathname, cari])

  React.useEffect(() => {
    function klik(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const tujuan = new URL(a.href, location.href)
      if (tujuan.origin !== location.origin) return
      if (tujuan.pathname === location.pathname && tujuan.search === location.search) return
      setAktif(true)
    }
    document.addEventListener('click', klik, true)
    return () => document.removeEventListener('click', klik, true)
  }, [])

  // Pengaman: bila navigasi dibatalkan (mis. tautan ke halaman yang sama dengan hash), padamkan sendiri
  React.useEffect(() => {
    if (!aktif) return
    const t = setTimeout(() => setAktif(false), 15000)
    return () => clearTimeout(t)
  }, [aktif])

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] transition-opacity duration-200 ${aktif ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`h-full bg-primary ${aktif ? 'animasi-bilah-muat' : ''}`} />
    </div>
  )
}
