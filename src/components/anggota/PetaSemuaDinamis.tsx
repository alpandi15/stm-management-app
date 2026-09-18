'use client'
import dynamic from 'next/dynamic'

export const PetaSemuaDinamis = dynamic(() => import('./PetaSemua').then((m) => m.PetaSemua), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center text-isi text-muted">Menyiapkan peta…</div>,
})
