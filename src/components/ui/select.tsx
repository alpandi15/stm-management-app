import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// <select> asli: dapat diakses, ringan, dan tampil sebagai daftar sistem yang dikenal
// pengguna Windows. Dibungkus supaya tinggi 48px dan gayanya sama dengan Input.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex min-h-sentuh w-full appearance-none rounded-input border border-border bg-surface pl-4 pr-11 text-form text-text transition-colors duration-150',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'aria-[invalid=true]:border-keluar disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
    </div>
  ),
)
Select.displayName = 'Select'

export { Select }
