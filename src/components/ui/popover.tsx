'use client'
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 6, collisionPadding = 12, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      // Jendela Electron di layar pendek (atau Windows dengan penskalaan 125%) sering tidak
      // menyisakan ruang penuh: isi dibatasi setinggi ruang yang tersedia lalu digulir di
      // dalam, dan diberi jarak 12px dari tepi jendela supaya tidak pernah terpotong.
      collisionPadding={collisionPadding}
      className={cn(
        'z-50 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain rounded-kartu border border-border bg-surface p-2 text-text shadow-kartu outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
