'use client'
import * as React from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { TiraiMuat } from './TiraiMuat'
import { PERISTIWA_NAVIGASI } from '@/lib/navigasi'

/**
 * Tirai muat satu layar dari klik tautan sampai router mulai merender halaman tujuan.
 * App Router tidak punya peristiwa "mulai navigasi", jadi tirai dinyalakan saat tautan
 * internal diklik dan dimatikan begitu pathname/query berubah — itu terjadi saat batas
 * loading.tsx tampil (bukan saat isi tiba), dan (app)/loading.tsx meneruskan tirai yang sama
 * sampai isinya datang. Jangan menunda setAktif(true): pathname bisa berubah lebih cepat
 * dari penundaan itu (rute sudah di-prefetch) dan tirai tidak pernah padam. Kedip untuk
 * halaman instan dicegah lewat animasi muncul yang ditunda 100 ms (utilitas animasi-tirai).
 */
export function PemantauNavigasi() {
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
    const terprogram = () => setAktif(true)
    document.addEventListener('click', klik, true)
    window.addEventListener(PERISTIWA_NAVIGASI, terprogram)
    return () => {
      document.removeEventListener('click', klik, true)
      window.removeEventListener(PERISTIWA_NAVIGASI, terprogram)
    }
  }, [])

  // Pengaman: bila navigasi tidak pernah selesai (mis. dibatalkan), padamkan sendiri
  React.useEffect(() => {
    if (!aktif) return
    const t = setTimeout(() => setAktif(false), 15000)
    return () => clearTimeout(t)
  }, [aktif])

  return aktif ? <TiraiMuat sumber="navigasi" /> : null
}
