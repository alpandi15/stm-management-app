'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { DOKUMEN, INFO_DOKUMEN } from '@/lib/dokumen'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** Tombol Cetak di kanan atas Laporan: pilihan tiga dokumen, membawa rentang & penyaring yang sedang tampil. */
export function MenuCetak() {
  const params = useSearchParams()
  const q = params.toString()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ukuran="aksi">
          <Printer /> Cetak
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-72">
        {DOKUMEN.map((d) => (
          <DropdownMenuItem key={d} asChild>
            <Link href={`/cetak/${d}${q ? `?${q}` : ''}`} className="flex-col items-start gap-0 py-2">
              <span className="font-semibold">{INFO_DOKUMEN[d].judul}</span>
              <span className="text-ket text-muted">{INFO_DOKUMEN[d].keterangan}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
