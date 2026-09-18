/** Judul halaman 24px/700 (docs/01 §3) dengan tempat untuk aksi di kanan. */
export function JudulHalaman({ children, aksi }: { children: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-judul font-bold">{children}</h1>
      {aksi}
    </div>
  )
}
