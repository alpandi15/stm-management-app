'use server'
import { revalidatePath } from 'next/cache'
import { aksiTerlindungi } from '@/server/auth/session'
import { GalatPengguna } from '@/server/galat'
import * as service from '@/server/services/transaksi'
import { hapusBerkasBukti, simpanBukti } from '@/server/services/bukti'
import { skemaCatatan, type InputCatatan } from '@/lib/validasi'
import { berhasil, gagal, type HasilAksi } from '@/lib/hasil'
import type { Transaksi } from '@/server/db/schema'

export type HasilSimpanCatatan =
  | { perluKonfirmasi: true; mirip: Array<{ noBukti: string; keterangan: string; tanggal: string }>; kalimat: string }
  | { perluKonfirmasi: false; catatan: Transaksi }

function segarkan() {
  revalidatePath('/catatan')
  revalidatePath('/beranda')
  revalidatePath('/laporan')
  revalidatePath('/riwayat')
  revalidatePath('/anggota')
}

/** Mengubah galat service menjadi hasil seragam; galat lain dilempar ke aksiTerlindungi. */
function tangkap<T>(fn: () => T): HasilAksi<T> {
  try {
    return berhasil(fn())
  } catch (e) {
    if (e instanceof GalatPengguna) return gagal(e.message, e.field)
    throw e
  }
}

/**
 * Membaca FormData dari form catatan. Angka dikirim sebagai string; foto sebagai berkas
 * di field `bukti`; `hapusBukti=1` berarti foto lama dilepas.
 */
function bacaForm(fd: FormData): { input: InputCatatan | null; galat?: { pesan: string; field?: string } } {
  const angka = (k: string) => {
    const v = fd.get(k)
    return v === null || v === '' ? undefined : Number(v)
  }
  const teks = (k: string) => {
    const v = fd.get(k)
    return typeof v === 'string' ? v : undefined
  }
  const hasil = skemaCatatan.safeParse({
    tanggal: teks('tanggal'),
    arah: teks('arah'),
    jenisId: angka('jenisId'),
    keterangan: teks('keterangan'),
    anggotaId: angka('anggotaId') ?? null,
    anggotaKeluargaId: angka('anggotaKeluargaId') ?? null,
    penyetorAnggotaId: angka('penyetorAnggotaId') ?? null,
    periode: teks('periode') || null,
    namaPihak: teks('namaPihak') ?? null,
    jumlah: angka('jumlah'),
    metode: teks('metode'),
    abaikanDuplikat: fd.get('abaikanDuplikat') === '1',
    biayaKutip: fd.get('biayaKutip') !== '0',
  })
  if (!hasil.success) {
    const isu = hasil.error.issues[0]
    return { input: null, galat: { pesan: isu?.message ?? 'Isian belum lengkap.', field: isu?.path[0]?.toString() } }
  }
  return { input: hasil.data }
}

export const simpanCatatan = aksiTerlindungi(async (fd: FormData): Promise<HasilAksi<HasilSimpanCatatan>> => {
  const { input, galat } = bacaForm(fd)
  if (!input) return gagal(galat!.pesan, galat!.field)

  const berkas = fd.get('bukti')
  let namaBukti: string | undefined
  if (berkas && typeof berkas !== 'string' && berkas.size > 0) {
    try {
      namaBukti = await simpanBukti(berkas)
    } catch (e) {
      if (e instanceof GalatPengguna) return gagal(e.message, e.field)
      throw e
    }
  }

  const hasil = tangkap(() => service.buatCatatan({ ...input, buktiFile: namaBukti ?? null }))
  // Berkas sudah tertulis tapi catatan batal (validasi/duplikat): bersihkan supaya folder tidak menumpuk
  if (namaBukti && (!hasil.ok || hasil.data.perluKonfirmasi)) hapusBerkasBukti(namaBukti)
  if (hasil.ok && !hasil.data.perluKonfirmasi) segarkan()
  return hasil
})

export const ubahCatatan = aksiTerlindungi(async (id: number, fd: FormData): Promise<HasilAksi<HasilSimpanCatatan>> => {
  const { input, galat } = bacaForm(fd)
  if (!input) return gagal(galat!.pesan, galat!.field)

  const berkas = fd.get('bukti')
  const lepasBukti = fd.get('hapusBukti') === '1'
  let namaBukti: string | null | undefined // undefined = tidak diubah
  if (berkas && typeof berkas !== 'string' && berkas.size > 0) {
    try {
      namaBukti = await simpanBukti(berkas)
    } catch (e) {
      if (e instanceof GalatPengguna) return gagal(e.message, e.field)
      throw e
    }
  } else if (lepasBukti) {
    namaBukti = null
  }

  const hasil = tangkap(() => service.ubahCatatan(id, { ...input, buktiFile: namaBukti }))
  if (namaBukti && (!hasil.ok || hasil.data.perluKonfirmasi)) hapusBerkasBukti(namaBukti)
  if (hasil.ok && !hasil.data.perluKonfirmasi) segarkan()
  return hasil
})

export const hapusCatatan = aksiTerlindungi(async (id: number): Promise<HasilAksi<Transaksi>> => {
  const hasil = tangkap(() => service.hapusCatatan(id))
  if (hasil.ok) segarkan()
  return hasil
})

export const kembalikanCatatan = aksiTerlindungi(async (id: number): Promise<HasilAksi<Transaksi>> => {
  const hasil = tangkap(() => service.kembalikanCatatan(id))
  if (hasil.ok) segarkan()
  return hasil
})
