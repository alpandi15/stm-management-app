'use client'
import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import type { BarisKejadian } from '@/server/queries/duka'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggal } from '@/lib/tanggal'
import { Button } from '@/components/ui/button'
import { KeadaanKosong } from '@/components/ui/keadaan-kosong'
import { cn } from '@/lib/utils'
import { FormKejadian, type PilihanAlmarhum } from './FormKejadian'

/** Halaman Buku Duka: satu kartu per kejadian, terbaru di atas, dengan bilah kemajuan pembayaran. */
export function DaftarKejadian({ daftar, pilihanAlmarhum, tarifBerlaku }: { daftar: BarisKejadian[]; pilihanAlmarhum: PilihanAlmarhum[]; tarifBerlaku: number | null }) {
  const [buka, setBuka] = React.useState(false)
  const totalNunggak = daftar.reduce((s, k) => s + k.totalNunggak, 0)
  const totalBelum = daftar.reduce((s, k) => s + (k.jumlahWajib - k.jumlahBayar), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-isi text-muted">
          {daftar.length === 0
            ? 'Belum ada kejadian yang dicatat.'
            : `${daftar.length} kejadian · tarif saat ini ${tarifBerlaku != null ? formatRupiah(tarifBerlaku) : '–'} · ${totalBelum} pembayaran belum masuk (${formatRupiah(totalNunggak)})`}
        </p>
        <Button ukuran="aksi" onClick={() => setBuka(true)}>
          <Plus /> Catat Kejadian
        </Button>
      </div>

      {daftar.length === 0 ? (
        <KeadaanKosong
          judul="Buku Duka masih kosong"
          kalimat="Catat setiap anggota atau keluarga yang meninggal beserta tarif iurannya. Setelah itu tinggal centang siapa yang sudah membayar — tunggakan tiap anggota terlihat sendiri."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {daftar.map((k) => {
            const persen = k.jumlahWajib === 0 ? 0 : Math.round((k.jumlahBayar / k.jumlahWajib) * 100)
            const lunas = k.jumlahWajib > 0 && k.jumlahBayar === k.jumlahWajib
            return (
              <li key={k.id}>
                <Link
                  href={`/duka/${k.id}`}
                  className="flex items-center gap-4 rounded-kartu border border-border bg-surface p-4 shadow-kartu transition-colors duration-150 hover:border-primary hover:bg-primary-soft sm:p-5"
                >
                  <span className="angka flex size-12 shrink-0 items-center justify-center rounded-full bg-bg text-judul-kartu font-bold text-muted">{k.nomor}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-judul-kartu font-semibold">Alm. {k.namaAlmarhum}</span>
                    <span className="block truncate text-isi text-muted">
                      {[k.hubungan, formatTanggal(k.tanggalMeninggal)].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-2 flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-badge bg-border">
                        <span className={cn('block h-full rounded-badge', lunas ? 'bg-masuk' : 'bg-primary')} style={{ width: `${persen}%` }} />
                      </span>
                      <span className={cn('angka shrink-0 text-ket font-semibold', lunas ? 'text-masuk' : 'text-text')}>
                        {k.jumlahBayar} / {k.jumlahWajib} bayar
                      </span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end sm:flex">
                    <span className="angka text-isi font-semibold">{formatRupiah(k.tarif)} / orang</span>
                    <span className={cn('angka text-ket', k.totalNunggak > 0 ? 'text-keluar' : 'text-masuk')}>
                      {k.totalNunggak > 0 ? `belum ${formatRupiah(k.totalNunggak)}` : 'lunas semua'}
                    </span>
                  </span>
                  <ChevronRight className="size-6 shrink-0 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <FormKejadian terbuka={buka} onTutup={() => setBuka(false)} pilihanAlmarhum={pilihanAlmarhum} tarifBerlaku={tarifBerlaku} />
    </div>
  )
}
