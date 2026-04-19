'use client'

import { useState } from 'react'
import type { AttendanceModel, AttendanceRecord, SubgroupSummary } from '@/lib/attendance/attendance-parser'
import { RotateCcw, Printer, Users } from 'lucide-react'
import type { UnmatchedReviewItem } from '@/lib/attendance/unmatched-review'

interface Props {
  model: AttendanceModel
  onReset: () => void
  onBack: () => void
  unmatchedItems?: UnmatchedReviewItem[]
  message?: string
}

export type OutputMode =
  | 'master'
  | 'subgroup'

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'master',   label: 'Master' },
  { id: 'subgroup', label: 'Subgroup' },
]

export function AttendanceReportPanel({ model, onReset, onBack, unmatchedItems = [], message }: Props) {
  const [outputMode, setOutputMode] = useState<OutputMode>('master')
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('')

  const generatedAt = new Date().toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const showMaster = outputMode === 'master'
  const showSubgroup = outputMode === 'subgroup'
  const allSubgroups = model.subgroupSummary.map(s => s.subgroup)
  const effectiveSelectedSubgroup = allSubgroups.includes(selectedSubgroup)
    ? selectedSubgroup
    : (allSubgroups[0] || '')
  const selectedSummary = model.subgroupSummary.find(s => s.subgroup === effectiveSelectedSubgroup) || null
  const selectedPresent = model.present.filter(r => (r.subgroup || '(Unassigned)') === effectiveSelectedSubgroup)
  const selectedAbsent = model.absent.filter(r => (r.subgroup || '(Unassigned)') === effectiveSelectedSubgroup)
  const selectedVisitors = model.visitors.filter(v => (v.subgroup || '(Unassigned)') === effectiveSelectedSubgroup)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #0F3D25 0%, #1B5E3C 100%)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.10)' }}>
              <Users size={20} color="#B8F0D2" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-white font-bold text-xl tracking-tight">ORS Report Suite</h1>
                <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(184,240,210,0.22)', color: '#B8F0D2', background: 'rgba(255,255,255,0.05)' }}>
                  Meeting Attendance
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.10)', color: '#B8F0D2' }}>
                  Mode: {OUTPUT_MODES.find(m => m.id === outputMode)?.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.10)', color: '#B8F0D2' }}>
              Back to Suite Home
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <Printer size={12} />Print / PDF
            </button>
            <button onClick={onReset} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <RotateCcw size={12} />New Upload
            </button>
          </div>
        </div>
      </header>

      {/* Mode tabs */}
      <div data-tab-bar style={{ background: '#0F3D25', borderBottom: '2px solid #1B5E3C' }}>
        <div className="flex items-end gap-1 px-6 pt-3 overflow-x-auto">
          {OUTPUT_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setOutputMode(m.id)}
              className="px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
              style={{
                background: outputMode === m.id ? '#F5F8FC' : 'transparent',
                color: outputMode === m.id ? '#0F3D25' : '#A0E8C0',
                borderBottom: outputMode === m.id ? '2px solid #1B5E3C' : 'none',
                marginBottom: outputMode === m.id ? '-2px' : '0',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {showSubgroup && (
          <div className="px-6 pb-2 pt-1 flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: '#6EE0A6' }}>Subgroup:</span>
            <select
              value={effectiveSelectedSubgroup}
              onChange={e => setSelectedSubgroup(e.target.value)}
              className="text-xs px-3 py-1.5 rounded border font-medium"
              style={{ background: '#0A2E1B', color: '#fff', borderColor: '#1B5E3C' }}
            >
              {allSubgroups.map(sg => (
                <option key={sg} value={sg}>{sg}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Print header */}
        <section className="print-suite-header hidden mb-6 rounded-2xl border p-5 print:block" style={{ borderColor: '#C6E9D5', background: 'linear-gradient(180deg,#F0FAF5 0%,#E4F5EC 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: '#1B5E3C' }}>ORS Report Suite - Meeting Attendance</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: '#0F3D25' }}>Attendance Report</h1>
              <p className="mt-1 text-sm" style={{ color: '#2D7A50' }}>Mode: {OUTPUT_MODES.find(m => m.id === outputMode)?.label}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold uppercase tracking-[0.12em]" style={{ color: '#1B5E3C' }}>Generated</p>
              <p className="mt-1 text-slate-600">{generatedAt}</p>
            </div>
          </div>
        </section>

        <div className="fade-in max-w-5xl mx-auto space-y-6">
          {message ? <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#C6E9D5', background: '#F0FAF5', color: '#1B5E3C' }}>{message}</div> : null}
          {unmatchedItems.length ? <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: '#FDE68A', background: '#FFFBEB', color: '#92400E' }}>{unmatchedItems.length} attendees were not found in the expected roster</div> : null}
          {/* Overall summary */}
          {showMaster && <OverallSummary model={model} />}

          {/* Subgroup summary */}
          {showMaster && <SubgroupSummaryTable summary={model.subgroupSummary} />}

          {/* Master view */}
          {showMaster && (
            <PeopleList title="MATCHED EXPECTED ATTENDEES" color="#1B5E3C" records={model.present} emptyMsg="No matched attendees" />
          )}

          {/* Subgroup detail view */}
          {showSubgroup && (
            <>
              {selectedSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Expected" value={selectedSummary.expected} sub={effectiveSelectedSubgroup} color="#1F3A5F" />
                  <StatCard label="Present" value={selectedSummary.present} sub={`${selectedSummary.pct}% attendance`} color="#1B5E3C" />
                  <StatCard label="Absent" value={selectedSummary.absent} sub={selectedSummary.expected ? `${Math.round((selectedSummary.absent / selectedSummary.expected) * 1000) / 10}% absent` : '0% absent'} color="#B91C1C" />
                  <StatCard label="Visitors" value={selectedSummary.visitors} sub="unmatched" color="#92400E" />
                </div>
              ) : null}
              <PeopleList
                title={`SUBGROUP PRESENT DETAIL - ${effectiveSelectedSubgroup.toUpperCase()}`}
                color="#1B5E3C"
                records={selectedPresent}
                emptyMsg="No present attendees in this subgroup"
              />
              <PeopleList
                title={`SUBGROUP ABSENT DETAIL - ${effectiveSelectedSubgroup.toUpperCase()}`}
                color="#B91C1C"
                records={selectedAbsent}
                emptyMsg="No absentees in this subgroup"
              />
            </>
          )}

          {/* Visitors */}
          {showMaster && model.visitors.length > 0 && (
            <PeopleList title="VISITORS / UNMATCHED ATTENDEES" color="#92400E" records={model.visitors} emptyMsg="" />
          )}
          {showSubgroup && selectedVisitors.length > 0 && (
            <PeopleList
              title={`VISITORS - ${effectiveSelectedSubgroup.toUpperCase()}`}
              color="#92400E"
              records={selectedVisitors}
              emptyMsg=""
            />
          )}

          {/* Integrity log */}
          <IntegrityLog entries={model.integrityLog} />
        </div>
      </main>
    </div>
  )
}

// â”€â”€â”€ OVERALL SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OverallSummary({ model }: { model: AttendanceModel }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Expected"  value={model.totalExpected} sub="on roster"      color="#1F3A5F" />
      <StatCard label="Present"   value={model.totalPresent}  sub={`${model.overallPct}% attendance`} color="#1B5E3C" />
      <StatCard label="Absent"    value={model.totalAbsent}   sub={`${model.totalExpected ? Math.round((model.totalAbsent / model.totalExpected) * 1000) / 10 : 0}% absent`} color="#B91C1C" />
      <StatCard label="Visitors"  value={model.totalVisitors} sub="unmatched"      color="#92400E" />
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="rounded-xl text-center overflow-hidden shadow-sm">
      <div className="py-1.5 text-xs font-bold text-white uppercase tracking-wider" style={{ background: color }}>{label}</div>
      <div className="py-4" style={{ background: 'var(--brand-pale)' }}>
        <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs mt-1 text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

// â”€â”€â”€ SUBGROUP SUMMARY TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SubgroupSummaryTable({ summary }: { summary: SubgroupSummary[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr" style={{ borderRadius: '0.5rem 0.5rem 0 0' }}>SUBGROUP SUMMARY</div>
      <table className="report-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Subgroup</th>
            <th>Expected</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Visitors</th>
            <th>Attendance %</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(s => (
            <tr key={s.subgroup}>
              <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>{s.subgroup}</td>
              <td>{s.expected}</td>
              <td><span className="font-bold" style={{ color: '#1B5E3C' }}>{s.present}</span></td>
              <td><span className="font-bold" style={{ color: s.absent > 0 ? '#B91C1C' : '#64748B' }}>{s.absent}</span></td>
              <td>{s.visitors > 0 ? <span style={{ color: '#92400E' }}>{s.visitors}</span> : '-'}</td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" style={{ minWidth: 48 }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, s.pct)}%`, background: s.pct >= 80 ? '#1B5E3C' : s.pct >= 60 ? '#D97706' : '#B91C1C' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: s.pct >= 80 ? '#1B5E3C' : s.pct >= 60 ? '#D97706' : '#B91C1C' }}>{s.pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// â”€â”€â”€ PEOPLE LIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PeopleList({ title, color, records, emptyMsg }: { title: string; color: string; records: AttendanceRecord[]; emptyMsg: string }) {
  if (!records.length) return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr" style={{ borderRadius: '0.5rem 0.5rem 0 0', background: color }}>{title} <span className="font-normal opacity-70">(0)</span></div>
      <p className="text-sm text-slate-400 italic p-4">{emptyMsg}</p>
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr" style={{ borderRadius: '0.5rem 0.5rem 0 0', background: color }}>{title} <span className="font-normal opacity-70">({records.length})</span></div>
      <table className="report-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Subgroup</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => (
            <tr key={`${r.matchKey || 'record'}-${r.subgroup || 'na'}-${idx}`}>
              <td className="font-medium" style={{ color: 'var(--brand-darkest)' }}>{r.fullName}</td>
              <td className="text-xs text-slate-500">{r.subgroup || '(Unassigned)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// â”€â”€â”€ SUBGROUP DETAIL BREAKDOWN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SubgroupDetail({ subgroups, present, absent, absenteeMode, title, subgroupFilter = 'all' }: {
  subgroups: SubgroupSummary[]
  present: AttendanceRecord[]
  absent: AttendanceRecord[]
  absenteeMode: boolean
  title?: string
  subgroupFilter?: string
}) {
  const resolvedTitle = title || (absenteeMode ? 'SUBGROUP ABSENT DETAIL' : 'SUBGROUP PRESENT DETAIL')
  const color = absenteeMode ? '#B91C1C' : '#1B5E3C'
  const visibleSubgroups = subgroupFilter === 'all'
    ? subgroups
    : subgroups.filter(sg => sg.subgroup === subgroupFilter)

  return (
    <div className="space-y-4">
      <div className="section-hdr" style={{ background: color }}>{resolvedTitle}</div>
      {visibleSubgroups.map(sg => {
        const records = (absenteeMode ? absent : present).filter(r => (r.subgroup || '(Unassigned)') === sg.subgroup)
        if (!records.length) return null
        return (
          <div key={sg.subgroup} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-2.5 font-semibold text-sm" style={{ background: 'var(--brand-pale)', color: 'var(--brand-darkest)' }}>
              <span>{sg.subgroup}</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: color, color: '#fff' }}>{records.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {records.map((r, idx) => (
                <div key={`${r.matchKey || 'record'}-${r.subgroup || 'na'}-${idx}`} className="flex items-center justify-between px-5 py-2 text-sm">
                  <span className="font-medium" style={{ color: 'var(--brand-darkest)' }}>{r.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// â”€â”€â”€ INTEGRITY LOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function IntegrityLog({ entries }: { entries: { level: 'INFO' | 'WARN' | 'ERR'; message: string }[] }) {
  const levelColor = { INFO: '#0369A1', WARN: '#92400E', ERR: '#B91C1C' }
  const levelBg    = { INFO: '#EFF6FF', WARN: '#FFFBEB', ERR: '#FEF2F2' }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr" style={{ borderRadius: '0.5rem 0.5rem 0 0' }}>DATA INTEGRITY LOG</div>
      <div className="p-4 space-y-1.5 font-mono text-xs">
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-3 rounded px-3 py-1.5" style={{ background: levelBg[e.level] }}>
            <span className="font-bold w-8 flex-shrink-0" style={{ color: levelColor[e.level] }}>{e.level}</span>
            <span style={{ color: '#374151' }}>{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

