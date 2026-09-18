'use client'
import { PilihanCari } from './pilihan-cari'
import { bulanDari, formatPeriode, hariIni, tambahBulan } from '@/lib/tanggal'

/**
 * Pilihan periode yang dibayar: bulan ('YYYY-MM') untuk jenis bulanan, tahun ('YYYY')
 * untuk tahunan. Bawaan mengikuti bulan/tahun tanggal catatan.
 */
export function PilihPeriode({ id, jenisPeriode, nilai, onUbah, label }: { id?: string; jenisPeriode: 'bulanan' | 'tahunan'; nilai: string | null; onUbah: (v: string) => void; label?: string }) {
  const sekarang = bulanDari(hariIni())
  const pilihan =
    jenisPeriode === 'bulanan'
      ? Array.from({ length: 30 }, (_, i) => tambahBulan(sekarang, 3 - i)).map((p) => ({ nilai: p, label: formatPeriode(p), keterangan: p === sekarang ? 'bulan ini' : undefined }))
      : Array.from({ length: 6 }, (_, i) => String(Number(sekarang.slice(0, 4)) + 1 - i)).map((p) => ({ nilai: p, label: p, keterangan: p === sekarang.slice(0, 4) ? 'tahun ini' : undefined }))
  return (
    <PilihanCari<string>
      id={id}
      label={label}
      nilai={nilai}
      onUbah={(v) => v && onUbah(v)}
      pilihan={pilihan}
      placeholder={jenisPeriode === 'bulanan' ? 'Pilih bulan…' : 'Pilih tahun…'}
      placeholderCari={jenisPeriode === 'bulanan' ? 'Ketik nama bulan…' : 'Ketik tahun…'}
    />
  )
}
