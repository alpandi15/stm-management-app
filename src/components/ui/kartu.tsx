import { cn } from '@/lib/utils'

/** Kartu pengaturan: judul, keterangan, isi. Bertumpuk tanpa tab (docs/01 §5.9). */
export function Kartu({ judul, keterangan, children, className, id }: { judul: string; keterangan?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} aria-label={judul} className={cn('rounded-kartu border border-border bg-surface p-6 shadow-kartu', className)}>
      <h2 className="text-judul-kartu font-semibold">{judul}</h2>
      {keterangan && <p className="mt-1 text-ket text-muted">{keterangan}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
