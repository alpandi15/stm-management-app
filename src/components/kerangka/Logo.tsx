import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Logo aplikasi (public/logo-app.png). Ukuran dalam piksel; sudut membulat mengikuti kartu. */
export function Logo({ ukuran = 40, className, prioritas }: { ukuran?: number; className?: string; prioritas?: boolean }) {
  return (
    <Image
      src="/logo-app.png"
      alt="Logo Aplikasi Kas STM"
      width={ukuran}
      height={ukuran}
      priority={prioritas}
      className={cn('shrink-0 rounded-[22%] shadow-kartu', className)}
    />
  )
}
