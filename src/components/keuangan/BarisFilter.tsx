'use client'
import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Jenis } from '@/server/db/schema'
import { Input } from '@/components/ui/input'
import { PilihanModal } from '@/components/ui/pilihan-modal'
import { PilihTanggal } from '@/components/ui/pilih-tanggal'
import { cn } from '@/lib/utils'
import type { PilihanRentang } from '@/lib/tanggal'

/**
 * Baris penyaring yang selalu terlihat (docs/01 §5.4). Semua pilihan hidup di URL
 * (searchParams) supaya halaman dirender di server dan bisa dibagikan/di-refresh.
 * Kata "filter" tidak muncul di layar — labelnya "Tampilkan".
 */
export function BarisFilter({ daftarJenis, daftarPenyetor, arah, jenisId, penyetor, rentang, awal, akhir, cari }: {
  daftarJenis: Jenis[]
  daftarPenyetor: Array<{ id: number; nama: string; pengutip: boolean }>
  arah: string
  jenisId: string
  penyetor: string
  rentang: PilihanRentang
  awal: string
  akhir: string
  cari: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [teksCari, setTeksCari] = React.useState(cari)

  function ubah(perubahan: Record<string, string | undefined>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(perubahan)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    p.delete('hal')
    router.push(`${pathname}?${p.toString()}`)
  }

  const jenisTersedia = arah ? daftarJenis.filter((j) => j.arah === arah) : daftarJenis

  return (
    <div className="flex flex-col gap-3 rounded-kartu border border-border bg-surface p-4 shadow-kartu">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rentang tanggal">
        {(
          [
            ['bulan-ini', 'Bulan Ini'],
            ['bulan-lalu', 'Bulan Lalu'],
            ['tahun-ini', 'Tahun Ini'],
            ['pilih', 'Pilih Tanggal'],
          ] as const
        ).map(([nilai, label]) => (
          <button
            key={nilai}
            type="button"
            role="radio"
            aria-checked={rentang === nilai}
            onClick={() => ubah({ rentang: nilai })}
            className={cn(
              'min-h-sentuh rounded-badge border-2 px-4 text-isi font-semibold transition-colors duration-150',
              rentang === nilai ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text hover:bg-bg',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {rentang === 'pilih' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-label font-semibold">
            Dari tanggal
            <PilihTanggal label="Dari tanggal" nilai={awal} onUbah={(v) => ubah({ awal: v })} />
          </div>
          <div className="flex flex-col gap-1 text-label font-semibold">
            Sampai tanggal
            <PilihTanggal label="Sampai tanggal" nilai={akhir} onUbah={(v) => ubah({ akhir: v })} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PilihanModal<string>
          label="Tampilkan jenis"
          nilai={arah || null}
          onUbah={(v) => ubah({ arah: v ?? undefined, jenis: undefined })}
          labelKosong="Semua: Masuk & Keluar"
          placeholder="Semua: Masuk & Keluar"
          pilihan={[
            { nilai: 'masuk', label: 'Uang Masuk saja' },
            { nilai: 'keluar', label: 'Uang Keluar saja' },
          ]}
        />
        <PilihanModal<string>
          label="Tampilkan untuk apa"
          nilai={jenisId || null}
          onUbah={(v) => ubah({ jenis: v ?? undefined })}
          labelKosong="Semua untuk apa"
          placeholder="Semua untuk apa"
          placeholderCari="Ketik nama jenis…"
          pilihan={jenisTersedia.map((j) => ({ nilai: String(j.id), label: j.nama, kelompok: arah ? undefined : j.arah === 'masuk' ? 'Uang Masuk' : 'Uang Keluar' }))}
        />
        <PilihanModal<string>
          label="Tampilkan penyetor"
          nilai={penyetor || null}
          onUbah={(v) => ubah({ penyetor: v ?? undefined })}
          labelKosong="Semua penyetor"
          placeholder="Semua penyetor"
          placeholderCari="Ketik nama penyetor…"
          pilihan={[{ nilai: 'bendahara', label: 'Bendahara (tanpa penyetor)' }, ...daftarPenyetor.map((a) => ({ nilai: String(a.id), label: a.nama, kelompok: a.pengutip ? 'Tim pengutip' : 'Anggota lain' }))]}
        />
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            ubah({ cari: teksCari.trim() || undefined })
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Cari keterangan"
            placeholder="Cari keterangan atau nama…"
            className="pl-12"
            value={teksCari}
            onChange={(e) => setTeksCari(e.target.value)}
            onBlur={() => teksCari.trim() !== cari && ubah({ cari: teksCari.trim() || undefined })}
          />
        </form>
      </div>
    </div>
  )
}
