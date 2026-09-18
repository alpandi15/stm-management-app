'use client'
import * as React from 'react'
import { FolderOpen } from 'lucide-react'
import { diElectron } from '@/lib/electron'
import { Kartu } from '@/components/ui/kartu'
import { Button } from '@/components/ui/button'

export function KartuTentang({ versi, dataDir }: { versi: string; dataDir: string }) {
  const [electron, setElectron] = React.useState(false)
  React.useEffect(() => setElectron(diElectron()), [])
  return (
    <Kartu judul="Tentang">
      <dl className="grid grid-cols-1 gap-3 text-isi sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <dt className="text-muted">Aplikasi</dt>
        <dd>Aplikasi Kas STM versi {versi}</dd>
        <dt className="text-muted">Lokasi berkas data</dt>
        <dd className="angka break-all">{dataDir}</dd>
      </dl>
      {electron && (
        <Button variant="sekunder" className="mt-4" onClick={() => window.stm?.bukaFolderData()}>
          <FolderOpen /> Buka Folder Data
        </Button>
      )}
      <p className="mt-4 text-ket text-muted">Aplikasi ini berjalan sepenuhnya di komputer ini, tanpa internet. Data tidak dikirim ke mana pun.</p>
    </Kartu>
  )
}
