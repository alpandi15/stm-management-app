import { cn } from '@/lib/utils'

/** Pesan kesalahan berupa kalimat (docs/01 P7). Dibaca pembaca layar lewat role="alert". */
export function PesanGalat({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null
  return (
    <p role="alert" className={cn('text-label font-medium text-keluar', className)}>
      {children}
    </p>
  )
}
