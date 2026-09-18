'use server'
import { revalidatePath } from 'next/cache'
import { aksiTerlindungi } from '@/server/auth/session'
import { GalatPengguna } from '@/server/galat'
import { db } from '@/server/db'
import * as service from '@/server/services/setoran'
import { sudahBayar } from '@/server/services/aturan-catatan'
import { hapusBerkasBukti, simpanBukti } from '@/server/services/bukti'
import { berhasil, gagal, type HasilAksi } from '@/lib/hasil'
import type { Metode } from '@/server/db/schema'

function segarkan() {
  for (const p of ['/catatan', '/beranda', '/laporan', '/riwayat', '/anggota']) revalidatePath(p)
}

function tangkap<T>(fn: () => T): HasilAksi<T> {
  try {
    return berhasil(fn())
  } catch (e) {
    if (e instanceof GalatPengguna) return gagal(e.message, e.field)
    throw e
  }
}

/** Peta anggota → nomor bukti yang sudah membayar jenis+periode (untuk daftar centang). */
export const cekSudahBayar = aksiTerlindungi(async (jenisId: number, periode: string | null) => berhasil(Object.fromEntries(sudahBayar(db, jenisId, periode))))

export const simpanSetoran = aksiTerlindungi(async (fd: FormData) => {
  const teks = (k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '')
  let kartu: service.KartuInput[]
  try {
    kartu = JSON.parse(teks('kartu') || '[]')
  } catch {
    return gagal('Rincian setoran tidak terbaca. Muat ulang halaman lalu coba lagi.', 'kartu')
  }
  const berkas = fd.get('bukti')
  let namaBukti: string | null = null
  if (berkas && typeof berkas !== 'string' && berkas.size > 0) {
    try {
      namaBukti = await simpanBukti(berkas)
    } catch (e) {
      if (e instanceof GalatPengguna) return gagal(e.message, e.field)
      throw e
    }
  }
  const hasil = tangkap(() =>
    service.buatSetoran({
      tanggal: teks('tanggal'),
      penyetorAnggotaId: Number(teks('penyetorAnggotaId')) || null,
      keterangan: teks('keterangan'),
      metode: (teks('metode') as Metode) || 'tunai',
      buktiFile: namaBukti,
      jenisUtamaId: Number(teks('jenisUtamaId')) || null,
      periodeUtama: teks('periodeUtama') || null,
      kartu,
    }),
  )
  if (!hasil.ok && namaBukti) hapusBerkasBukti(namaBukti)
  if (hasil.ok) segarkan()
  return hasil
})

export const hapusSetoran = aksiTerlindungi(async (id: number) => {
  const hasil = tangkap(() => service.hapusSetoran(id))
  if (hasil.ok) segarkan()
  return hasil
})
