import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Font dibundel lokal saat build (next/font) — aplikasi harus jalan tanpa internet.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'Aplikasi Kas STM',
  description: 'Pembukuan kas Serikat Tolong Menolong',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
