'use client'
import * as React from 'react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { KartuCatatan } from './KartuCatatan'
import { DialogHapus } from './DialogHapus'
import { Dialog, DialogContent } from '@/components/ui/dialog'

/** Daftar kartu + dialog hapus + pratinjau foto. Statusnya di sini supaya kartu tetap sederhana. */
export function DaftarCatatan({ baris }: { baris: BarisCatatan[] }) {
  const [hapus, setHapus] = React.useState<BarisCatatan | null>(null)
  const [bukti, setBukti] = React.useState<BarisCatatan | null>(null)
  return (
    <>
      <ul className="flex flex-col gap-3">
        {baris.map((c) => (
          <li key={c.id}>
            <KartuCatatan catatan={c} onHapus={setHapus} onLihatBukti={setBukti} />
          </li>
        ))}
      </ul>
      <DialogHapus catatan={hapus} terbuka={hapus !== null} onTutup={() => setHapus(null)} />
      <Dialog open={bukti !== null} onOpenChange={(o) => !o && setBukti(null)}>
        <DialogContent judul={bukti ? `Bukti ${bukti.noBukti}` : 'Bukti'} className="max-w-2xl">
          {bukti?.buktiFile && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/bukti/${bukti.buktiFile}`} alt={`Foto bukti ${bukti.noBukti}`} className="max-h-[70vh] w-full rounded-input object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
