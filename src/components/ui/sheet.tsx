'use client'
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Panel geser dari kanan (docs/01 §5.8) di atas Radix Dialog; di layar sempit memenuhi lebar. */
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { judul: string }
>(({ className, children, judul, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="animasi-overlay fixed inset-0 z-40 bg-black/60" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'animasi-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-6 text-text shadow-kartu focus:outline-none',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <DialogPrimitive.Title className="text-judul font-bold">{judul}</DialogPrimitive.Title>
        <DialogPrimitive.Close className="flex size-sentuh items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text" aria-label="Tutup">
          <X className="size-6" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'

export { Sheet, SheetTrigger, SheetContent }
