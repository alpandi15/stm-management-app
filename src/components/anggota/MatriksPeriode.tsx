import type { MatriksJenis } from '@/server/queries/anggota'
import { cn } from '@/lib/utils'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Kotak "sudah bayar / belum" per jenis berperiode. Kata yang dipakai: sudah / belum — bukan "menunggak". */
export function MatriksPeriode({ daftar }: { daftar: MatriksJenis[] }) {
  const bulanIni = new Date().getMonth() + 1
  const tahunIni = new Date().getFullYear()
  if (daftar.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {daftar.map((m) => (
        <section key={m.jenisId} className="rounded-kartu border border-border bg-surface p-4 shadow-kartu sm:p-6" aria-label={`Pembayaran ${m.nama}`}>
          <h3 className="font-semibold">{m.nama}</h3>
          <p className="mb-3 text-ket text-muted">
            <span className="mr-3 inline-flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-masuk" /> sudah bayar</span>
            <span className="mr-3 inline-flex items-center gap-1"><span className="inline-block size-3 rounded-sm border border-border bg-bg" /> belum</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-sm border border-dashed border-border" /> belum jatuh tempo</span>
          </p>
          <div className="overflow-x-auto">
            <table className="angka text-ket">
              <thead>
                <tr>
                  <th className="pr-3 text-left font-semibold text-muted">Tahun</th>
                  {m.periode === 'bulanan' ? BULAN.map((b) => <th key={b} className="px-1 pb-1 text-center font-semibold text-muted">{b}</th>) : <th className="px-1 pb-1 text-center font-semibold text-muted">Status</th>}
                </tr>
              </thead>
              <tbody>
                {m.tahun.map((th) => (
                  <tr key={th}>
                    <td className="pr-3 font-semibold">{th}</td>
                    {(m.periode === 'bulanan' ? BULAN.map((_, i) => `${th}-${String(i + 1).padStart(2, '0')}`) : [String(th)]).map((p) => {
                      const no = m.sudah[p]
                      const belumJatuhTempo = m.periode === 'bulanan' ? th > tahunIni || (th === tahunIni && Number(p.slice(5)) > bulanIni) : th > tahunIni
                      return (
                        <td key={p} className="p-0.5">
                          <span
                            title={no ? `${p} · ${no}` : belumJatuhTempo ? `${p} · belum jatuh tempo` : `${p} · belum bayar`}
                            className={cn(
                              'flex size-8 items-center justify-center rounded-md text-[13px] font-semibold',
                              no ? 'bg-masuk text-arah-fg' : belumJatuhTempo ? 'border border-dashed border-border text-muted' : 'border border-border bg-bg text-muted',
                            )}
                          >
                            {no ? '✓' : belumJatuhTempo ? '' : '–'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
