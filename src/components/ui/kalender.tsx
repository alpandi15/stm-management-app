'use client'
import * as React from 'react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { id as lokalId } from 'react-day-picker/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Kalender (react-day-picker) bergaya shadcn dengan token kita: sel 40px, minggu mulai Senin,
 * nama bulan Indonesia, pilihan bulan/tahun lewat dropdown supaya lompat tahun tidak perlu
 * klik berulang.
 */
export function Kalender({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={lokalId}
      weekStartsOn={1}
      captionLayout="dropdown"
      startMonth={new Date(2015, 0)}
      endMonth={new Date(new Date().getFullYear() + 1, 11)}
      showOutsideDays
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col',
        month: 'flex flex-col gap-3',
        month_caption: 'flex min-h-sentuh items-center justify-center px-11',
        caption_label: 'hidden',
        dropdowns: 'flex items-center gap-2',
        dropdown_root: 'relative rounded-input border border-border bg-surface',
        dropdown: 'min-h-10 cursor-pointer appearance-none bg-transparent px-3 pr-8 text-isi font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-primary',
        nav: 'absolute inset-x-2 top-2 flex items-center justify-between',
        weeks: '',
        button_previous: 'flex size-10 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text disabled:opacity-30',
        button_next: 'flex size-10 items-center justify-center rounded-input text-muted hover:bg-bg hover:text-text disabled:opacity-30',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-10 text-center text-ket font-semibold uppercase text-muted',
        week: 'mt-1 flex',
        day: 'p-0',
        day_button: 'angka flex size-10 items-center justify-center rounded-input text-isi transition-colors duration-150 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        today: '[&>button]:font-bold [&>button]:text-primary',
        selected: '[&>button]:bg-primary [&>button]:text-primary-fg [&>button]:hover:bg-primary',
        outside: '[&>button]:text-muted [&>button]:opacity-50',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => (orientation === 'left' ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />),
      }}
      {...props}
    />
  )
}
