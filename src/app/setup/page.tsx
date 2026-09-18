import { redirect } from 'next/navigation'
import { sudahSetup } from '@/server/queries/pengaturan'
import { WizardSetup } from './WizardSetup'

export const dynamic = 'force-dynamic'

// Hanya bisa dibuka saat pengaturan belum ada (docs/02 §4.1). Sesudahnya → layar kunci,
// supaya tidak ada jalan menimpa PIN lewat URL.
export default function HalamanSetup() {
  if (sudahSetup()) redirect('/')
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg p-4 sm:p-6">
      <div className="w-full max-w-md rounded-kartu border border-border bg-surface p-6 shadow-kartu sm:p-8">
        <WizardSetup />
      </div>
    </main>
  )
}
