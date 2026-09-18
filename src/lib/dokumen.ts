import { formatBulan, type Periode, type Rentang } from './tanggal'

export const DOKUMEN = ['ringkas', 'buku-kas', 'pemeriksaan'] as const
export type Dokumen = (typeof DOKUMEN)[number]

export const INFO_DOKUMEN: Record<Dokumen, { judul: string; orientasi: 'potret' | 'lanskap'; keterangan: string }> = {
  ringkas: { judul: 'Laporan Ringkas Kas', orientasi: 'potret', keterangan: 'Ringkasan, rincian per jenis, tanda tangan' },
  'buku-kas': { judul: 'Buku Kas', orientasi: 'lanskap', keterangan: 'Seluruh catatan dengan saldo berjalan' },
  pemeriksaan: { judul: 'Berita Acara Pemeriksaan Kas', orientasi: 'potret', keterangan: 'Hasil pemeriksaan, daftar perubahan, tanda tangan' },
}

export function apakahDokumen(s: string): s is Dokumen {
  return (DOKUMEN as readonly string[]).includes(s)
}

/** Nama berkas PDF deskriptif — hasilnya dikirim lewat WhatsApp (docs/02 §7). */
export function namaBerkasDokumen(dokumen: Dokumen, periode: Periode, rentang: Rentang): string {
  const dasar = { ringkas: 'Laporan-Ringkas', 'buku-kas': 'Buku-Kas', pemeriksaan: 'Pemeriksaan-Kas' }[dokumen]
  const bersih = (s: string) => s.replace(/\s+/g, '-')
  let rentangTeks: string
  if (periode === 'bulanan') rentangTeks = bersih(formatBulan(rentang.awal))
  else if (periode === 'tahunan') rentangTeks = rentang.awal.slice(0, 4)
  else if (periode === 'harian') rentangTeks = rentang.awal
  else rentangTeks = `${rentang.awal}_${rentang.akhir}`
  return `${dasar}-${rentangTeks}.pdf`
}
