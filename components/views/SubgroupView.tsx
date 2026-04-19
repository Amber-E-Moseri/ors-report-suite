'use client'

import type { ReactNode } from 'react'
import type { SubgroupReportData, FTHierarchyEntry } from '@/types'
import { gradeLabel, healthBand } from '@/lib/scoring'
import { pctText } from '@/lib/parsers'

interface Props {
  data: SubgroupReportData
  grade: boolean
  colourPct: boolean
}

export function SubgroupView({ data, grade, colourPct }: Props) {
  const {
    subgroup, notes, uniquePeople, totalMembers, groupsActive, totalGroups,
    pct, leaderCount, score, fellowshipRows, leaderRows,
    ftCellData, ftServiceData, ftCellTotal, ftServiceTotal, ftCombinedTotal,
    ftSubgroupName, rangeText,
  } = data

  const band  = healthBand(score)
  const label = gradeLabel(score)

  return (
    <div className="fade-in max-w-4xl mx-auto space-y-5">
      {/* Title */}
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight">{subgroup}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>📅 {rangeText}</p>
      </div>

      {/* Follow-up summary */}
      <Section title="FOLLOW-UP SUMMARY">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <MiniStat label="Total Notes"    value={notes} />
          <MiniStat label="Unique People"  value={uniquePeople} />
          <MiniStat label="Total Members"  value={totalMembers} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MiniStatPct
            label="% Reached"
            value={pctText(pct)}
            band={grade && colourPct ? band : undefined}
          />
          <MiniStat label="Groups Active" value={`${groupsActive} / ${totalGroups}`} />
          <MiniStat label="Leaders"        value={leaderCount} />
        </div>
        {grade && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-dark)' }}>
              Grade
            </span>
            <span
              className="grade-badge text-2xl"
              style={{ background: band.bg, color: band.fg, minWidth: 56, height: 44 }}
            >
              {label}
            </span>
          </div>
        )}
      </Section>

      {/* Fellowship detail */}
      <Section title="FELLOWSHIP DETAIL">
        {fellowshipRows.length === 0 ? (
          <p className="text-sm text-slate-400 italic">(No fellowship data for this subgroup)</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Group</th>
                <th>Notes</th>
                <th>People</th>
                <th>Members</th>
                <th>% Reached</th>
                {grade && <th>Grade</th>}
              </tr>
            </thead>
            <tbody>
              {fellowshipRows.map(row => {
                const rb = healthBand(row.score)
                return (
                  <tr key={row.group}>
                    <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                      {row.group}
                    </td>
                    <td>{row.notes}</td>
                    <td>{row.people}</td>
                    <td>{row.members}</td>
                    <td>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={grade && colourPct ? { background: rb.bg, color: rb.fg } : {}}
                      >
                        {pctText(row.pct)}
                      </span>
                    </td>
                    {grade && (
                      <td>
                        <span className="grade-badge" style={{ background: rb.bg, color: rb.fg }}>
                          {gradeLabel(row.score)}
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
                <td>{fellowshipRows.reduce((s, r) => s + r.notes,  0)}</td>
                <td>{fellowshipRows.reduce((s, r) => s + r.people, 0)}</td>
                <td>{fellowshipRows.reduce((s, r) => s + r.members, 0)}</td>
                <td>
                  {grade && (
                    <span className="grade-badge" style={{ background: band.bg, color: band.fg }}>
                      {label}
                    </span>
                  )}
                </td>
                {grade && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      {/* Leaders */}
      <Section title="LEADERS PARTICIPATING">
        {leaderRows.length === 0 ? (
          <p className="text-sm text-slate-400 italic">(No leader data for this subgroup)</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '80%' }}>Leader</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {leaderRows.map((row, i) => (
                <tr key={i}>
                  <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>{row.name}</td>
                  <td className="font-bold" style={{ color: 'var(--brand-mid)' }}>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* First-Timers */}
      {(ftSubgroupName && (ftCellTotal > 0 || ftServiceTotal > 0)) ? (
        <Section title="FIRST-TIMERS">
          <div className="space-y-3">
            <FTTallyBlock
              title="CELL FIRST-TIMERS"
              color="#1F3A5F"
              entry={ftCellData}
              total={ftCellTotal}
            />
            <FTTallyBlock
              title="SERVICE FIRST-TIMERS"
              color="#2E5FA3"
              entry={ftServiceData}
              total={ftServiceTotal}
            />
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg text-white font-bold"
              style={{ background: '#0D2540' }}
            >
              <span>TOTAL FIRST-TIMERS</span>
              <span className="text-2xl">{ftCombinedTotal}</span>
            </div>
          </div>
        </Section>
      ) : ftSubgroupName ? (
        <Section title="FIRST-TIMERS">
          <p className="text-sm text-slate-400 italic">No first-timer records found for this subgroup in the uploaded CSVs.</p>
        </Section>
      ) : (
        <Section title="FIRST-TIMERS">
          <p className="text-sm text-slate-400 italic">ℹ️ Upload Cell FTs and/or Service FTs CSVs to see first-timer data.</p>
        </Section>
      )}
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr m-0 rounded-none px-4 py-2.5">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-mid)' }}>{value}</p>
    </div>
  )
}

function MiniStatPct({
  label, value, band,
}: { label: string; value: string; band?: { bg: string; fg: string } }) {
  return (
    <div className="stat-card text-center" style={band ? { background: band.bg } : {}}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1"
        style={{ color: band ? band.fg : 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: band ? band.fg : 'var(--brand-mid)' }}>
        {value}
      </p>
    </div>
  )
}

function FTTallyBlock({
  title, color, entry, total,
}: { title: string; color: string; entry: FTHierarchyEntry | null; total: number }) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-100">
      <div
        className="flex items-center justify-between px-4 py-2.5 text-white font-bold text-sm"
        style={{ background: color }}
      >
        <span>{title}</span>
        <span className="text-lg">{total}</span>
      </div>
      {entry && (
        <table className="report-table text-xs">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', background: '#E4EEF9', color: '#0D2540' }}>Group</th>
              <th style={{ background: '#E4EEF9', color: '#0D2540' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(entry.groups)
              .sort((a, b) => b[1] - a[1])
              .map(([group, count]) => (
                <tr key={group}>
                  <td>{group}</td>
                  <td>{count}</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr>
              <td>SUBTOTAL</td>
              <td>{entry.total}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
