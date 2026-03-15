'use client'

import type { RegionalRow } from '@/types'
import { gradeLabel, healthBand } from '@/lib/scoring'
import { pctText } from '@/lib/parsers'

interface Props {
  rows: RegionalRow[]
  grade: boolean
  colourPct: boolean
  rangeText: string
}

export function RegionalView({ rows, grade, colourPct, rangeText }: Props) {
  const totals = rows.reduce(
    (acc, r) => ({
      notes:        acc.notes        + r.notes,
      uniquePeople: acc.uniquePeople + r.uniquePeople,
      members:      acc.members      + r.members,
    }),
    { notes: 0, uniquePeople: 0, members: 0 },
  )

  return (
    <div className="fade-in max-w-5xl mx-auto">
      {/* Title */}
      <div
        className="rounded-xl px-6 py-5 mb-6 text-white"
        style={{ background: 'var(--brand-darkest)' }}
      >
        <h1 className="text-xl font-bold tracking-tight">Regional Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>📅 {rangeText}</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Notes"    value={totals.notes}        />
        <StatCard label="Unique People"  value={totals.uniquePeople} />
        <StatCard label="Total Members"  value={totals.members}      />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="report-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Subgroup</th>
              <th>Notes</th>
              <th>People</th>
              <th>Members</th>
              <th>% Reached</th>
              <th>Groups Active</th>
              {grade && <th>Grade</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const band  = healthBand(row.score)
              const label = gradeLabel(row.score)
              return (
                <tr key={row.subgroup}>
                  <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                    {row.subgroup}
                  </td>
                  <td>{row.notes}</td>
                  <td>{row.uniquePeople}</td>
                  <td>{row.members}</td>
                  <td>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={colourPct && grade ? { background: band.bg, color: band.fg } : {}}
                    >
                      {pctText(row.pct)}
                    </span>
                  </td>
                  <td>{row.groupsActive} / {row.totalGroups}</td>
                  {grade && (
                    <td>
                      <span className="grade-badge" style={{ background: band.bg, color: band.fg }}>
                        {label}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td>{totals.notes}</td>
              <td>{totals.uniquePeople}</td>
              <td>{totals.members}</td>
              <td></td>
              <td></td>
              {grade && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card rounded-xl text-center">
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ color: 'var(--brand-mid)' }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
