import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from './button'

/** Tombol "Kembali" di kepala halaman form — bawaan ke Catatan Kas. */
export function TombolKembali({ ke = '/catatan', label = 'Kembali' }: { ke?: string; label?: string }) {
  return (
    <Button asChild variant="sekunder">
      <Link href={ke}>
        <ArrowLeft /> {label}
      </Link>
    </Button>
  )
}
