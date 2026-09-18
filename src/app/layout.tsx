import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ambilPengaturan } from '@/server/queries/pengaturan'
import { PenyediaTema, SKRIP_TEMA_AWAL } from '@/components/kerangka/PenyediaTema'
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

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pilihan tema tersimpan di database (docs/01 §3): sistem / terang / gelap
  const tema = ambilPengaturan()?.tema ?? 'sistem'
  return (
    <html lang="id" className={jakarta.variable} data-tema-pilihan={tema} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA_AWAL }} />
      </head>
      <body>
        <PenyediaTema pilihan={tema} />
        {children}
      </body>
    </html>
  )
}
