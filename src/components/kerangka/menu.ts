import { FileText, History, House, NotebookPen, Settings, Tags, Users, type LucideIcon } from 'lucide-react'

/** Tujuh item menu (docs/01 §4; Jenis Uang dipisah dari Pengaturan atas permintaan pemilik). */
export type ItemMenu = { rute: string; label: string; Ikon: LucideIcon }

export const MENU: ReadonlyArray<ItemMenu> = [
  { rute: '/beranda', label: 'Beranda', Ikon: House },
  { rute: '/catatan', label: 'Catatan Kas', Ikon: NotebookPen },
  { rute: '/laporan', label: 'Laporan', Ikon: FileText },
  { rute: '/riwayat', label: 'Riwayat', Ikon: History },
  { rute: '/anggota', label: 'Anggota', Ikon: Users },
  { rute: '/jenis', label: 'Jenis Uang', Ikon: Tags },
  { rute: '/pengaturan', label: 'Pengaturan', Ikon: Settings },
]

/** Di bilah bawah (< 768px) hanya lima item pertama; Jenis Uang dan Pengaturan lewat ikon di header. */
export const MENU_BILAH_BAWAH = MENU.slice(0, 5)
