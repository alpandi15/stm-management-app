import { LoaderCircle } from 'lucide-react'

/** Tampil di area isi saat halaman berikutnya masih disiapkan server (Suspense App Router). */
export default function Memuat() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted" role="status" aria-live="polite">
      <LoaderCircle className="size-8 animate-spin text-primary" />
      <p className="text-isi">Memuat…</p>
    </div>
  )
}
