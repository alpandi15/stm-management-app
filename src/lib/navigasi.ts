/**
 * Memberi tahu tirai muat (kerangka/PemantauNavigasi) bahwa navigasi terprogram dimulai —
 * dipanggil tepat sebelum router.push/replace pada penyaring, urutan, dan sejenisnya.
 * Klik tautan biasa sudah terdeteksi sendiri; ini untuk yang tanpa <a>.
 */
export const PERISTIWA_NAVIGASI = 'stm:navigasi'

export function mulaiNavigasi(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PERISTIWA_NAVIGASI))
}
