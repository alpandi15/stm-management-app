import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge harus tahu token kustom di globals.css. Tanpa ini ia mengira
// `text-form` (ukuran font) dan `text-primary-fg` (warna) bentrok, lalu membuang salah
// satunya — tombol kehilangan warna teksnya tanpa galat apa pun.
const twMerge = extendTailwindMerge<'gradien'>({
  extend: {
    theme: {
      text: ['ket', 'label', 'isi', 'form', 'judul-kartu', 'judul', 'saldo'],
      radius: ['kartu', 'input', 'badge'],
      shadow: ['kartu'],
      spacing: ['sentuh', 'aksi', 'aksi-besar', 'sidebar'],
      container: ['konten'],
      ease: ['tenang'],
      animate: ['getar'],
    },
    classGroups: {
      // utilitas kustom di globals.css yang tidak boleh dianggap bentrok dengan warna
      gradien: ['gradien-primary', 'gradien-keluar'],
    },
  },
})

/** Gabungan kelas Tailwind (pola shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
