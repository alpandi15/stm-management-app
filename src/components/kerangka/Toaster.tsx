'use client'
import { Toaster as SonnerToaster } from 'sonner'

/** Toast (sonner) dengan token kita: teks 16px, kartu 16px, satu bayangan. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      duration={4000}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-kartu border border-border bg-surface p-4 text-isi font-medium text-text shadow-kartu',
          success: 'border-masuk bg-masuk-soft text-masuk',
          error: 'border-keluar bg-keluar-soft text-keluar',
          warning: 'border-warning bg-warning-soft text-warning',
          description: 'text-ket text-muted',
          closeButton: 'ml-auto rounded-badge p-1 text-muted hover:bg-bg',
        },
      }}
    />
  )
}
