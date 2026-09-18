import { FileText, History, House, NotebookPen, Settings, Users, type LucideIcon } from 'lucide-react'

/** Enam item menu, tidak lebih (docs/01 §4). */
export type ItemMenu = { rute: string; label: string; Ikon: LucideIcon }

export const MENU: ReadonlyArray<ItemMenu> = [
  { rute: '/beranda', label: 'Beranda', Ikon: House },
  { rute: '/catatan', label: 'Catatan Kas', Ikon: NotebookPen },
  { rute: '/laporan', label: 'Laporan', Ikon: FileText },
  { rute: '/riwayat', label: 'Riwayat', Ikon: History },
  { rute: '/anggota', label: 'Anggota', Ikon: Users },
  { rute: '/pengaturan', label: 'Pengaturan', Ikon: Settings },
]

/** Di bilah bawah (< 768px) hanya lima item pertama; Pengaturan pindah ke ikon di header. */
export const MENU_BILAH_BAWAH = MENU.slice(0, 5)
export const ITEM_PENGATURAN = MENU[5]
