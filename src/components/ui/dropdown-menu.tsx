'use client'
import * as React from 'react'
import { DropdownMenu as Primitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const DropdownMenu = Primitive.Root
const DropdownMenuTrigger = Primitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-50 min-w-48 rounded-input border border-border bg-surface p-1.5 text-text shadow-kartu', className)}
      {...props}
    />
  </Primitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item> & { bahaya?: boolean }
>(({ className, bahaya, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      'flex min-h-sentuh cursor-pointer select-none items-center gap-3 rounded-input px-3 text-isi outline-none data-[highlighted]:bg-bg data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-5',
      bahaya && 'text-keluar data-[highlighted]:bg-keluar-soft',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
