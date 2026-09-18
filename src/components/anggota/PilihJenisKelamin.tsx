'use client'
import { Lock } from 'lucide-react'
import { jenisKelaminDariHubungan, LABEL_JENIS_KELAMIN, type JenisKelamin } from '@/lib/validasi'
import { Label } from '@/components/ui/label'
import { PilihanGanda } from '@/components/ui/pilihan-ganda'

/**
 * Pilihan jenis kelamin (boleh kosong; klik lagi untuk mengosongkan). Bila hubungannya
 * Istri/Suami, nilainya mengikuti hubungan dan tidak bisa diubah — server juga memaksanya.
 */
export function PilihJenisKelamin({
  nilai,
  onUbah,
  hubungan,
  label = 'Jenis kelamin',
  ringkas,
}: {
  nilai: JenisKelamin | null
  onUbah: (v: JenisKelamin | null) => void
  hubungan?: string | null
  label?: string
  /** Tanpa <Label> — untuk baris kecil di dalam kartu */
  ringkas?: boolean
}) {
  const terkunci = jenisKelaminDariHubungan(hubungan)
  const tampil = terkunci ?? nilai
  return (
    <div className="flex flex-col gap-2">
      {!ringkas && (
        <Label>
          {label} {!terkunci && <span className="font-normal text-muted">(boleh kosong)</span>}
        </Label>
      )}
      <PilihanGanda
        label={label}
        nilai={tampil}
        nonaktif={!!terkunci}
        onPilih={(v) => onUbah(v === nilai ? null : v)}
        pilihan={[
          { nilai: 'L', label: LABEL_JENIS_KELAMIN.L },
          { nilai: 'P', label: LABEL_JENIS_KELAMIN.P },
        ]}
      />
      {terkunci && (
        <p className="flex items-center gap-1 text-ket text-muted">
          <Lock className="size-3.5" /> {hubungan} otomatis {LABEL_JENIS_KELAMIN[terkunci].toLowerCase()}, tidak bisa diubah.
        </p>
      )}
    </div>
  )
}
