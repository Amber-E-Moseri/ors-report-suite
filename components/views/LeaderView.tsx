'use client'

import type { LeaderRank } from '@/types'
import { Trophy, Medal } from 'lucide-react'

interface Props {
  ranks: LeaderRank[]
}

export function LeaderView({ ranks }: Props) {
  const grandTotal = ranks.reduce((s, r) => s + r.notes, 0)

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-5">
      {/* Title */}
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Trophy size={20} />
          Leader Note Counter
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
          {ranks.length} leaders · {grandTotal} total notes
        </p>
      </div>

      {ranks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400 italic text-sm">
          No leader data found. Ensure your ELVANTO Notes CSV has a &quot;leader&quot; column.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: 56 }}>#</th>
                <th style={{ textAlign: 'left' }}>Leader</th>
                <th>Notes</th>
                <th style={{ textAlign: 'left' }}>Subgroup</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((row, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>
                    {i === 0 ? <Medal size={16} color="#F59E0B" className="inline" /> :
                     i === 1 ? <Medal size={16} color="#94A3B8" className="inline" /> :
                     i === 2 ? <Medal size={16} color="#B45309" className="inline" /> :
                     <span className="text-slate-400 text-xs">{i + 1}</span>}
                  </td>
                  <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                    {row.leader}
                  </td>
                  <td>
                    <span
                      className="inline-block px-3 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: 'var(--brand-pale)', color: 'var(--brand-mid)' }}
                    >
                      {row.notes}
                    </span>
                  </td>
                  <td className="text-sm text-slate-500">{row.subgroup}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td>GRAND TOTAL</td>
                <td>{grandTotal}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
