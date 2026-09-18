'use client'
import { useEffect } from 'react'
import type { Tema } from '@/server/db/schema'

/**
 * Menerapkan pilihan tema ke <html data-tema="terang|gelap"> (docs/01 §3).
 * Skrip inline di layout root sudah melakukannya sebelum hidrasi (tanpa kedip);
 * komponen ini menangani perubahan pilihan dan perubahan tema sistem saat aplikasi berjalan.
 */
export function PenyediaTema({ pilihan }: { pilihan: Tema }) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const terapkan = () => {
      const gelap = pilihan === 'gelap' || (pilihan === 'sistem' && media.matches)
      document.documentElement.setAttribute('data-tema', gelap ? 'gelap' : 'terang')
    }
    terapkan()
    media.addEventListener('change', terapkan)
    return () => media.removeEventListener('change', terapkan)
  }, [pilihan])
  return null
}

/** Dipasang di <head> sebagai skrip inline: berjalan sebelum CSS dipakai, mencegah kedip. */
export const SKRIP_TEMA_AWAL = `(function(){var p=document.documentElement.getAttribute('data-tema-pilihan')||'sistem';var g=p==='gelap'||(p==='sistem'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-tema',g?'gelap':'terang')})()`
