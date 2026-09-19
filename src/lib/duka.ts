// Aturan Buku Duka yang murni (dipakai server dan klien): siapa yang wajib membayar iuran
// untuk satu kejadian meninggal. Satu-satunya tempat aturan ini ditulis — jangan ditiru di SQL.

export type AnggotaUntukDuka = {
  id: number
  aktif: boolean
  status: 'aktif' | 'meninggal'
  tanggalMeninggal: string | null
  tanggalBergabung: string | null
  tanggalNonaktif: string | null
  /** Tunggakan lama (sebelum Buku Duka dipakai), per kelompok tarif */
  tunggakanLama?: Array<{ jumlah: number; tarif: number }>
}

export type KejadianUntukDuka = {
  id: number
  tanggalMeninggal: string
  tarif: number
  anggotaId: number | null
  anggotaKeluargaId: number | null
}

/**
 * Wajib bayar bila anggota sudah bergabung dan masih hidup serta aktif pada tanggal kejadian:
 * - bergabung setelah kejadian → tidak wajib (tanggal bergabung kosong = anggota lama, wajib)
 * - anggota itu sendiri yang meninggal (kejadian atas namanya, bukan keluarganya) → tidak wajib
 * - sudah meninggal sebelum kejadian → tidak wajib
 * - nonaktif: wajib hanya untuk kejadian sebelum/pada tanggal nonaktif; nonaktif tanpa
 *   tanggal (data lama) → tidak wajib
 */
export function wajibBayarDuka(a: AnggotaUntukDuka, k: KejadianUntukDuka): boolean {
  if (a.tanggalBergabung && a.tanggalBergabung > k.tanggalMeninggal) return false
  if (k.anggotaId === a.id && !k.anggotaKeluargaId) return false
  if (a.status === 'meninggal' && a.tanggalMeninggal && a.tanggalMeninggal < k.tanggalMeninggal) return false
  if (!a.aktif) {
    if (!a.tanggalNonaktif) return false
    if (a.tanggalNonaktif < k.tanggalMeninggal) return false
  }
  return true
}

export type TunggakanDuka = {
  jumlahWajib: number
  jumlahBayar: number
  /** Kejadian di Buku Duka yang belum dicentang */
  jumlahNunggakKejadian: number
  totalNunggakKejadian: number
  /** Tunggakan lama yang almarhumnya tidak tercatat */
  lamaJumlah: number
  lamaRupiah: number
  /** Gabungan kejadian + lama — dipakai badge, penyaring, dan ringkasan */
  jumlahNunggak: number
  totalNunggak: number
}

/** Ringkasan tunggakan seorang anggota atas daftar kejadian (+ tunggakan lama), diberi himpunan id kejadian yang sudah dibayar. */
export function hitungTunggakan(a: AnggotaUntukDuka, kejadian: KejadianUntukDuka[], sudahBayar: Set<number>): TunggakanDuka {
  let jumlahWajib = 0
  let jumlahBayar = 0
  let totalNunggakKejadian = 0
  for (const k of kejadian) {
    if (!wajibBayarDuka(a, k)) continue
    jumlahWajib += 1
    if (sudahBayar.has(k.id)) jumlahBayar += 1
    else totalNunggakKejadian += k.tarif
  }
  let lamaJumlah = 0
  let lamaRupiah = 0
  for (const t of a.tunggakanLama ?? []) {
    lamaJumlah += t.jumlah
    lamaRupiah += t.jumlah * t.tarif
  }
  const jumlahNunggakKejadian = jumlahWajib - jumlahBayar
  return {
    jumlahWajib,
    jumlahBayar,
    jumlahNunggakKejadian,
    totalNunggakKejadian,
    lamaJumlah,
    lamaRupiah,
    jumlahNunggak: jumlahNunggakKejadian + lamaJumlah,
    totalNunggak: totalNunggakKejadian + lamaRupiah,
  }
}
