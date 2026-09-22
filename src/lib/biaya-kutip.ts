/**
 * Biaya kutip (docs/02 §5.1f): sekian persen dari uang masuk jenis tertentu menjadi bagian
 * pengutip dan dicatat otomatis sebagai uang keluar. Uang masuk TETAP dicatat bruto
 * (100.000 masuk, 10.000 keluar), bukan neto — saldo kas = masuk − keluar seperti biasa.
 * Hasil dibulatkan ke bawah ke rupiah penuh hanya bila persentasenya menghasilkan pecahan.
 */
export function hitungBiayaKutip(jumlah: number, persen: number | null | undefined): number {
  if (!persen || persen <= 0 || jumlah <= 0) return 0
  return Math.floor((jumlah * persen) / 100)
}

export function adaBiayaKutip(j: { arah: string; biayaKutipPersen: number | null }): boolean {
  return j.arah === 'masuk' && !!j.biayaKutipPersen && j.biayaKutipPersen > 0
}
