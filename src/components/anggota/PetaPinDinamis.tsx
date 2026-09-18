'use client'
import dynamic from 'next/dynamic'

// Leaflet menyentuh `window` saat dimuat — hanya boleh di klien, tanpa SSR.
export const PetaPinDinamis = dynamic(() => import('./PetaPin').then((m) => m.PetaPin), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-input border border-border bg-bg" aria-hidden />,
})
