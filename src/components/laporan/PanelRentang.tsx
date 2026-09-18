'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Jenis } from '@/server/db/schema'
import type { Periode } from '@/lib/tanggal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const PILIHAN: ReadonlyArray<[Periode, string]> = [
  ['harian', 'Harian'],
  ['mingguan', 'Mingguan'],
  ['bulanan', 'Bulanan'],
  ['tahunan', 'Tahunan'],
  ['pilih', 'Pilih Sendiri'],
]

/** Panel atas Laporan (docs/01 §5.6): periode sebagai tombol, tanggal acuan, penyaring jenis/cara bayar. */
export function PanelRentang({
  periode,
  acuan,
  awal,
  akhir,
  jenisId,
  metode,
  daftarJenis,
}: {
  periode: Periode
  acuan: string
  awal: string
  akhir: string
  jenisId: string
  metode: string
  daftarJenis: Jenis[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function ubah(perubahan: Record<string, string | undefined>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(perubahan)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-kartu border border-border bg-surface p-4 shadow-kartu">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rentang Tanggal">
        {PILIHAN.map(([nilai, label]) => (
          <button
            key={nilai}
            type="button"
            role="radio"
            aria-checked={periode === nilai}
            onClick={() => ubah({ periode: nilai })}
            className={cn(
              'min-h-sentuh rounded-badge border-2 px-4 text-isi font-semibold transition-colors duration-150',
              periode === nilai ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text hover:bg-bg',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {periode === 'pilih' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-label font-semibold">
            Dari tanggal
            <Input type="date" className="angka" value={awal} onChange={(e) => ubah({ awal: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-label font-semibold">
            Sampai tanggal
            <Input type="date" className="angka" value={akhir} onChange={(e) => ubah({ akhir: e.target.value })} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-label font-semibold sm:max-w-xs">
          Tanggal acuan
          <Input type="date" className="angka" value={acuan} onChange={(e) => ubah({ acuan: e.target.value })} />
        </label>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select aria-label="Tampilkan jenis" value={jenisId} onChange={(e) => ubah({ jenis: e.target.value })}>
          <option value="">Semua jenis</option>
          {daftarJenis.map((j) => (
            <option key={j.id} value={j.id}>
              {j.arah === 'masuk' ? 'Masuk' : 'Keluar'} · {j.nama}
            </option>
          ))}
        </Select>
        <Select aria-label="Tampilkan cara bayar" value={metode} onChange={(e) => ubah({ metode: e.target.value })}>
          <option value="">Tunai & Transfer</option>
          <option value="tunai">Tunai saja</option>
          <option value="transfer">Transfer saja</option>
        </Select>
      </div>
    </div>
  )
}
