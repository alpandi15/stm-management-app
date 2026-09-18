import { redirect } from 'next/navigation'
import { identitasUntukLayarKunci } from '@/server/queries/pengaturan'
import { adaSesi } from '@/server/auth/session'
import { LayarKunci } from './LayarKunci'

export const dynamic = 'force-dynamic'

// Layar kunci (docs/01 §5.2). Belum setup → /setup. Sudah punya sesi sah → langsung Beranda.
export default async function HalamanKunci() {
  const identitas = identitasUntukLayarKunci()
  if (!identitas) redirect('/setup')
  if (await adaSesi()) redirect('/beranda')
  return <LayarKunci namaStm={identitas.namaStm} namaBendahara={identitas.namaBendahara} />
}
