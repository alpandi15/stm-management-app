// Jembatan ke proses utama Electron (docs/03 §3). preload.js (Fase 9) memasang window.stm.
// Di browser saat pengembangan window.stm tidak ada, dan setiap pemanggil menyediakan
// alternatif (window.print(), unduhan biasa).

export type HasilJembatan<T = undefined> = { ok: true; data: T } | { ok: false; pesan: string }

export type JembatanStm = {
  /** printToPDF halaman aktif lalu dialog simpan dengan nama bawaan */
  cetakPdf(namaBerkas: string): Promise<HasilJembatan<{ path: string }>>
  /** Dialog simpan; mengembalikan path tujuan. Server lalu VACUUM INTO ke sana (cadangkanKeLokasi). */
  pilihLokasiCadangan(namaBawaan: string): Promise<HasilJembatan<{ path: string }>>
  /** Dialog buka berkas .db; mengembalikan path untuk diperiksa server */
  pilihBerkasPulihkan(): Promise<HasilJembatan<{ path: string }>>
  bukaFolderData(): Promise<void>
  versi(): Promise<{ versi: string; dataDir: string }>
}

declare global {
  interface Window {
    stm?: JembatanStm
  }
}

export function diElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.stm !== 'undefined'
}
