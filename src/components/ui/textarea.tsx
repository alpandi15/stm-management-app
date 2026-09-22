import * as React from 'react'
import { cn } from '@/lib/utils'

// Area teks bergaya sama dengan Input: tepi 2px kuat, latar putih, 17px; tiga baris bawaan.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'flex w-full resize-y rounded-input border-2 border-border-kuat bg-input px-4 py-3 text-form leading-snug text-text placeholder:text-muted transition-colors duration-150',
      'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      'aria-[invalid=true]:border-keluar aria-[invalid=true]:ring-keluar disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
