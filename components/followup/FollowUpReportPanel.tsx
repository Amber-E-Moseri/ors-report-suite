'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { GroupDirectory, NotesData, FollowUpSubgroup, RegionalRow } from '@/types'
import { FOLLOW_UP_SUBGROUPS } from '@/types'
import { CalendarRange, FileText, Printer, RotateCcw } from 'lucide-react'
import { computeSubgroupReport } from '@/lib/compute-reports'
import { gradeLabel, healthBand } from '@/lib/scoring'
import { pctText } from '@/lib/parsers'
import { RegionalView } from '../views/RegionalView'
import { MiniStat, MiniStatPct } from '../ui/StatCards'

interface Props {
  notesData: NotesData
  groupDir: GroupDirectory
  onReset: () => void
  onBack: () => void
}

type FUView = 'regional' | 'subgroup'

const stickyHeaderStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
  background: 'var(--brand-mid)',
  color: '#fff',
}

export function FollowUpReportPanel({ notesData, groupDir, onReset, onBack }: Props) {
  const [view, setView] = useState<FUView>('subgroup')
  const [activeSubgroup, setActiveSubgroup] = useState<FollowUpSubgroup>(FOLLOW_UP_SUBGROUPS[0])
  const [grade, setGrade] = useState(true)
  const [colourPct, setColourPct] = useState(true)

  const data = useMemo(
    () => computeSubgroupReport(activeSubgroup, groupDir, notesData, null),
    [activeSubgroup, groupDir, notesData],
  )

  const regionalRows = useMemo<RegionalRow[]>(
    () =>
      FOLLOW_UP_SUBGROUPS.map((subgroup) => {
        const report = computeSubgroupReport(subgroup, groupDir, notesData, null)
        return {
          subgroup: report.subgroup,
          notes: report.notes,
          uniquePeople: report.uniquePeople,
          members: report.totalMembers,
          pct: report.pct,
          score: report.score,
          groupsActive: report.groupsActive,
          totalGroups: report.totalGroups,
        }
      }),
    [groupDir, notesData],
  )

  const band = healthBand(data.score)
  const label = gradeLabel(data.score)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 shadow-sm" style={{ background: 'var(--gradient-header)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <FileText size={20} color="#DCE9F8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-white font-bold text-xl tracking-tight">ORS Report Suite</h1>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{
                    borderColor: 'rgba(184,212,255,0.22)',
                    color: '#B8D4FF',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  Follow-Up
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#F8FBFF' }}
                >
                  <CalendarRange size={13} />
                  {notesData.rangeText}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 report-actions">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-300 font-medium">Grade</span>
              <button
                onClick={() => setGrade((v) => !v)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: grade ? '#22C55E' : '#475569' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: grade ? '18px' : '2px' }}
                />
              </button>
            </label>
            {grade && (
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-300 font-medium">Colour %</span>
                <button
                  onClick={() => setColourPct((v) => !v)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ background: colourPct ? '#22C55E' : '#475569' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: colourPct ? '18px' : '2px' }}
                  />
                </button>
              </label>
            )}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.10)', color: '#DCE9F8' }}
            >
              {'<- Back to Suite Home'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: 'var(--brand-dark)', color: '#fff' }}
            >
              <Printer size={12} />
              Print / PDF
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: 'var(--brand-dark)', color: '#fff' }}
            >
              <RotateCcw size={12} />
              New Upload
            </button>
          </div>
        </div>
      </header>

      <div data-tab-bar style={{ background: 'var(--brand-darkest)', borderBottom: '2px solid var(--brand-dark)' }}>
        <div className="flex items-end gap-1 px-6 py-2.5 overflow-x-auto">
          {(['regional', 'subgroup'] as FUView[]).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className="px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                background: view === option ? '#F5F8FC' : 'transparent',
                color: view === option ? 'var(--brand-darkest)' : '#90AACC',
                borderBottom: view === option ? '2px solid var(--brand-dark)' : 'none',
                marginBottom: view === option ? '-2px' : '0',
              }}
            >
              {option === 'regional' ? 'Regional View' : 'Subgroup View'}
            </button>
          ))}
        </div>

        {view === 'subgroup' && (
          <div className="px-6 py-2.5 flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: '#90AACC' }}>
              Subgroup:
            </span>
            <select
              value={activeSubgroup}
              onChange={(event) => setActiveSubgroup(event.target.value as FollowUpSubgroup)}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: '#fff',
                borderRadius: 6,
                color: '#1E293B',
                border: '1px solid rgba(255,255,255,0.30)',
              }}
            >
              {FOLLOW_UP_SUBGROUPS.map((subgroup) => (
                <option key={subgroup} value={subgroup}>
                  {subgroup}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-auto p-6">
        {view === 'regional' ? (
          <RegionalView rows={regionalRows} grade={grade} colourPct={colourPct} rangeText={notesData.rangeText} />
        ) : (
          <div className="fade-in max-w-4xl mx-auto space-y-5">
            <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
              <h1 className="text-xl font-bold tracking-tight">{data.subgroup}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
                {data.rangeText}
              </p>
            </div>

            <Section title="FOLLOW-UP SUMMARY">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <MiniStat label="Total Notes" value={data.notes} />
                <MiniStat label="Unique People" value={data.uniquePeople} />
                <MiniStat label="Total Members" value={data.totalMembers} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniStatPct
                  label="% Reached"
                  value={pctText(data.pct)}
                  band={grade && colourPct ? band : undefined}
                />
                <MiniStat label="Groups Active" value={`${data.groupsActive} / ${data.totalGroups}`} />
                <MiniStat label="Leaders" value={data.leaderCount} />
              </div>
              {grade && (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-dark)' }}>
                    Grade
                  </span>
                  <span className="grade-badge text-2xl" style={{ background: band.bg, color: band.fg, minWidth: 56, height: 44 }}>
                    {label}
                  </span>
                </div>
              )}
            </Section>

            <Section title="FELLOWSHIP DETAIL">
              {data.fellowshipRows.length === 0 ? (
                <p className="text-sm text-slate-400 italic">(No fellowship data for this subgroup)</p>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ ...stickyHeaderStyle, textAlign: 'left' }}>Group</th>
                      <th style={stickyHeaderStyle}>Notes</th>
                      <th style={stickyHeaderStyle}>People</th>
                      <th style={stickyHeaderStyle}>Members</th>
                      <th style={stickyHeaderStyle}>% Reached</th>
                      {grade && <th style={stickyHeaderStyle}>Grade</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.fellowshipRows.map((row) => {
                      const rowBand = healthBand(row.score)
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
                              style={grade && colourPct ? { background: rowBand.bg, color: rowBand.fg } : undefined}
                            >
                              {pctText(row.pct)}
                            </span>
                          </td>
                          {grade && (
                            <td>
                              <span className="grade-badge" style={{ background: rowBand.bg, color: rowBand.fg }}>
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
                      <td>{data.fellowshipRows.reduce((sum, row) => sum + row.notes, 0)}</td>
                      <td>{data.fellowshipRows.reduce((sum, row) => sum + row.people, 0)}</td>
                      <td>{data.fellowshipRows.reduce((sum, row) => sum + row.members, 0)}</td>
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

            <Section title="LEADERS PARTICIPATING">
              {data.leaderRows.length === 0 ? (
                <p className="text-sm text-slate-400 italic">(No leader data for this subgroup)</p>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ ...stickyHeaderStyle, textAlign: 'left', width: '80%' }}>Leader</th>
                      <th style={stickyHeaderStyle}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderRows.map((row) => (
                      <tr key={row.name}>
                        <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                          {row.name}
                        </td>
                        <td className="font-bold" style={{ color: 'var(--brand-mid)' }}>
                          {row.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr m-0 rounded-none px-4 py-2.5">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}
