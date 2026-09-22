'use client'
import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dialog bergaya shadcn di atas Radix, dengan token kita. Tanpa animasi masuk yang panjang.
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { judul: string; tanpaTutup?: boolean }
>(({ className, children, judul, tanpaTutup, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="animasi-overlay fixed inset-0 z-40 bg-black/60" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'animasi-dialog fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-kartu border border-border bg-surface p-6 text-text shadow-kartu focus:outline-none',
        className,
      )}
      {...props}
    >
      <DialogPrimitive.Title className="pr-10 text-judul-kartu font-semibold">{judul}</DialogPrimitive.Title>
      {children}
      {!tanpaTutup && (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text"
          aria-label="Tutup"
        >
          <X className="size-5" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'

const DialogDescription = DialogPrimitive.Description

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogDescription }
