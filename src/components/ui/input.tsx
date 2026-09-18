import * as React from 'react'
import { cn } from '@/lib/utils'

// Input teks: tinggi 48px, teks 17px (docs/01 P4). Galat ditandai lewat aria-invalid.
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex min-h-sentuh w-full rounded-input border border-border bg-surface px-4 text-form text-text placeholder:text-muted transition-colors duration-150',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'aria-[invalid=true]:border-keluar aria-[invalid=true]:ring-keluar disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
