import { KeadaanKosong } from '@/components/ui/keadaan-kosong'

export default function TidakDitemukan() {
  return (
    <KeadaanKosong
      judul="Halaman tidak ditemukan"
      kalimat="Catatan atau halaman yang dicari tidak ada, mungkin sudah dihapus."
      tombol={{ label: 'Kembali ke Beranda', href: '/beranda' }}
    />
  )
}
