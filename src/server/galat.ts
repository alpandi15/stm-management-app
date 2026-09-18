/**
 * Galat yang pesannya memang untuk pengguna (Bahasa Indonesia, berupa kalimat).
 * Dilempar dari service, ditangkap Server Action dan diubah jadi { ok: false, pesan }.
 * Galat lain (bug, disk penuh) tetap Error biasa dan dilaporkan sebagai "tidak terduga".
 */
export class GalatPengguna extends Error {
  field?: string
  constructor(pesan: string, field?: string) {
    super(pesan)
    this.name = 'GalatPengguna'
    this.field = field
  }
}
