import React from 'react'
import type { BarisCatatan } from '@/server/queries/transaksi'
import { kalimatMeninggal } from '@/lib/catatan'
import type { Pengaturan } from '@/server/db/schema'
import type { Rentang } from '@/lib/tanggal'
import { formatRupiah } from '@/lib/rupiah'
import { formatTanggalPendek } from '@/lib/tanggal'
import { Kop } from './Kop'
import { TandaTangan } from './TandaTangan'

/** Buku Kas (lanskap): seluruh catatan dalam rentang dengan kolom saldo berjalan. */
export function DokumenBukuKas({ baris, sisaAwal, rentang, p }: { baris: BarisCatatan[]; sisaAwal: number; rentang: Rentang; p: Pengaturan }) {
  let saldo = sisaAwal
  const totalMasuk = baris.reduce((a, b) => a + (b.arah === 'masuk' ? b.jumlah : 0), 0)
  const totalKeluar = baris.reduce((a, b) => a + (b.arah === 'keluar' ? b.jumlah : 0), 0)
  return (
    <>
      <Kop namaStm={p.namaStm} alamat={p.alamat} judul="Buku Kas" rentang={rentang} />
      <table style={{ fontSize: '9.5pt' }} className="buku-kas">
        <thead>
          <tr>
            <th style={{ width: '4%' }}>No</th>
            <th className="rapat" style={{ width: '9%' }}>Tanggal</th>
            <th className="rapat" style={{ width: '11%' }}>No. Bukti</th>
            <th>Keterangan</th>
            <th style={{ width: '15%' }}>Jenis</th>
            <th className="angka" style={{ width: '11%' }}>Uang Masuk</th>
            <th className="angka" style={{ width: '11%' }}>Uang Keluar</th>
            <th className="angka" style={{ width: '12%' }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr className="total">
            <td colSpan={7}>Sisa kas awal</td>
            <td className="angka">{formatRupiah(sisaAwal)}</td>
          </tr>
          {baris.map((b, i) => {
            saldo += b.arah === 'masuk' ? b.jumlah : -b.jumlah
            // Kelompok setoran kolektif: subjudul di baris pertama, subtotal setelah baris terakhir
            const awalSetoran = b.setoranId && (i === 0 || baris[i - 1].setoranId !== b.setoranId)
            const akhirSetoran = b.setoranId && (i === baris.length - 1 || baris[i + 1].setoranId !== b.setoranId)
            const anggotaSetoran = b.setoranId ? baris.filter((x) => x.setoranId === b.setoranId) : []
            return (
              <React.Fragment key={b.id}>
              {awalSetoran && (
                <tr style={{ background: '#eef2ff' }}>
                  <td colSpan={8} style={{ fontWeight: 600 }}>
                    Setoran {b.nomorSetoran}{b.namaPenyetor ? ` · disetor oleh ${b.namaPenyetor}` : ''} · {anggotaSetoran.length} catatan
                  </td>
                </tr>
              )}
              <tr>
                <td className="tengah">{i + 1}</td>
                <td className="rapat">{formatTanggalPendek(b.tanggal)}</td>
                <td className="rapat">{b.noBukti}</td>
                <td>
                  {b.keterangan}
                  {b.namaPihak ? ` — ${b.namaPihak}` : ''}
                  {kalimatMeninggal(b) && <div style={{ fontSize: '8.5pt', color: '#6b7280' }}>Meninggal: {kalimatMeninggal(b)}</div>}
                  {b.namaPenyetor && <div style={{ fontSize: '8.5pt', color: '#6b7280' }}>{b.arah === 'masuk' ? 'Disetor oleh' : 'Diserahkan oleh'}: {b.namaPenyetor}</div>}
                </td>
                <td>{b.namaJenis}</td>
                <td className="angka">{b.arah === 'masuk' ? formatRupiah(b.jumlah) : ''}</td>
                <td className="angka">{b.arah === 'keluar' ? formatRupiah(b.jumlah) : ''}</td>
                <td className="angka">{formatRupiah(saldo)}</td>
              </tr>
              {akhirSetoran && (
                <tr style={{ background: '#f9fafb' }}>
                  <td colSpan={5} style={{ textAlign: 'right', fontStyle: 'italic' }}>Subtotal setoran {b.nomorSetoran}</td>
                  <td className="angka" style={{ fontStyle: 'italic' }}>{formatRupiah(anggotaSetoran.reduce((t, x) => t + (x.arah === 'masuk' ? x.jumlah : 0), 0))}</td>
                  <td className="angka" style={{ fontStyle: 'italic' }}>{formatRupiah(anggotaSetoran.reduce((t, x) => t + (x.arah === 'keluar' ? x.jumlah : 0), 0))}</td>
                  <td />
                </tr>
              )}
              </React.Fragment>
            )
          })}
          <tr className="total">
            <td colSpan={5}>Jumlah · {baris.length} catatan</td>
            <td className="angka">{formatRupiah(totalMasuk)}</td>
            <td className="angka">{formatRupiah(totalKeluar)}</td>
            <td className="angka">{formatRupiah(saldo)}</td>
          </tr>
        </tbody>
      </table>
      <TandaTangan namaBendahara={p.namaBendahara} namaKetua={p.namaKetua} />
    </>
  )
}
