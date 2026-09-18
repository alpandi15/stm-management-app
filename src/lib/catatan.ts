/** Kalimat "yang meninggal" untuk kartu, rincian, dan PDF (Spec 2 §A5). null bila bukan jenis penanda. */
export function kalimatMeninggal(b: { menandaiMeninggal: boolean; namaMeninggal: string | null; hubunganMeninggal: string | null; namaAnggota: string | null }): string | null {
  if (!b.menandaiMeninggal) return null
  if (b.namaMeninggal) return `${b.namaMeninggal} · ${b.hubunganMeninggal}`
  if (b.namaAnggota) return `${b.namaAnggota} · anggota sendiri`
  return null
}
