import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Tombol bergaya shadcn/ui di atas token kita. Tinggi minimum 48px, aksi utama 56px (docs/01 P4).
const variasiTombol = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-input font-semibold transition-colors duration-150 ease-tenang select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        utama: 'bg-primary text-primary-fg hover:bg-primary-hover',
        sekunder: 'border border-border bg-surface text-text hover:bg-bg',
        halus: 'text-text hover:bg-bg',
        masuk: 'bg-masuk text-arah-fg hover:opacity-90',
        keluar: 'bg-keluar text-arah-fg hover:opacity-90',
        bahaya: 'border border-keluar text-keluar bg-surface hover:bg-keluar-soft',
        tautan: 'text-primary underline-offset-4 hover:underline h-auto min-h-0 px-1',
      },
      ukuran: {
        biasa: 'min-h-sentuh px-5 text-isi',
        aksi: 'min-h-aksi px-6 text-form',
        besar: 'min-h-aksi-besar px-6 text-form',
        ikon: 'size-sentuh',
      },
    },
    defaultVariants: { variant: 'utama', ukuran: 'biasa' },
  },
)

export type PropsTombol = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variasiTombol> & { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, PropsTombol>(
  ({ className, variant, ukuran, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    return <Comp ref={ref} type={asChild ? undefined : type} className={cn(variasiTombol({ variant, ukuran }), className)} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, variasiTombol }
