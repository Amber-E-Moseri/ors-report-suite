'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, RotateCcw } from 'lucide-react'
import { aggregateByView, filterSnapshots, type DashboardMetric, type DashboardView } from '@/lib/history/dashboard-aggregators'
import { loadWeeklyHistory, resetWeeklyHistory, type WeeklySnapshot } from '@/lib/history/snapshot-storage'
import {
  loadGrowthStatsHistory,
  resetGrowthStatsHistory,
  upsertGrowthStatSnapshot,
  type GrowthPeriodType,
  type GrowthStatSnapshot,
} from '@/lib/history/growth-stats-storage'

const METRICS: { id: DashboardMetric; label: string }[] = [
  { id: 'notesCount', label: 'Notes' },
  { id: 'peopleContacted', label: 'People contacted' },
  { id: 'activeGroups', label: 'Active groups' },
  { id: 'activeLeaders', label: 'Active leaders' },
  { id: 'firstTimersCount', label: 'First timers' },
  { id: 'attendanceExpected', label: 'Attendance expected' },
  { id: 'attendancePresent', label: 'Attendance present' },
  { id: 'attendanceAbsent', label: 'Attendance absent' },
  { id: 'visitorsCount', label: 'Visitors' },
]

export function GrowthDashboard({ onClose }: { onClose?: () => void }) {
  const [history, setHistory] = useState<WeeklySnapshot[]>([])
  const [growthStats, setGrowthStats] = useState<GrowthStatSnapshot[]>([])
  const [reportType, setReportType] = useState('all')
  const [region, setRegion] = useState('all')
  const [subgroup, setSubgroup] = useState('all')
  const [groupOrCell, setGroupOrCell] = useState('all')
  const [metric, setMetric] = useState<DashboardMetric>('attendancePresent')
  const [view, setView] = useState<DashboardView>('overall')
  const [periodType, setPeriodType] = useState<GrowthPeriodType>('week')
  const [periodLabel, setPeriodLabel] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loaded = loadWeeklyHistory()
    setHistory(loaded)
    setGrowthStats(loadGrowthStatsHistory())
    setMessage(loaded.length ? 'Weekly snapshot history loaded' : 'No weekly history found yet')
  }, [])

  useEffect(() => {
    const now = new Date()
    if (periodType === 'month') {
      setPeriodLabel(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
      return
    }
    const week = getIsoWeek(now)
    setPeriodLabel(`${now.getFullYear()}-W${String(week).padStart(2, '0')}`)
  }, [periodType])

  const reportTypes = Array.from(new Set(history.map(h => h.reportType)))
  const regions = Array.from(new Set(history.map(h => h.region).filter(Boolean)))
  const subgroups = Array.from(new Set(history.map(h => h.subgroup).filter(Boolean)))
  const groups = Array.from(new Set(history.map(h => h.groupOrCell).filter(Boolean)))

  const filtered = useMemo(() => filterSnapshots(history, { reportType, region, subgroup, groupOrCell }), [history, reportType, region, subgroup, groupOrCell])
  const rows = useMemo(() => aggregateByView(filtered, view, metric), [filtered, view, metric])
  const statsRows = useMemo(() => buildGrowthRows(growthStats.filter(row => row.periodType === periodType)), [growthStats, periodType])

  function handleCaptureGrowthSnapshot() {
    const notesOverall = latestOverallSnapshot(history, 'followup') || latestOverallSnapshot(history, 'weekly')
    const firstTimersOverall = latestOverallSnapshot(history, 'ft') || latestOverallSnapshot(history, 'weekly')
    const attendanceOverall = latestOverallSnapshot(history, 'attendance')

    const snapshot: GrowthStatSnapshot = {
      id: `growth_${periodType}_${periodLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      periodType,
      periodLabel,
      capturedAt: new Date().toISOString(),
      notesCount: Number(notesOverall?.notesCount || 0),
      firstTimersCount: Number(firstTimersOverall?.firstTimersCount || 0),
      attendanceExpected: Number(attendanceOverall?.attendanceExpected || 0),
      attendancePresent: Number(attendanceOverall?.attendancePresent || 0),
      attendanceAbsent: Number(attendanceOverall?.attendanceAbsent || 0),
    }
    const next = upsertGrowthStatSnapshot(snapshot)
    setGrowthStats(next)
    setMessage(`Saved ${periodType} growth snapshot for ${periodLabel}`)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="section-hdr">Growth Dashboard</div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#EBF2FB', color: '#2A5298' }}>{message}</div>
            {onClose ? <button onClick={onClose} className="ml-auto px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#0D2540' }}>Close</button> : null}
            <button onClick={() => { if (confirm('Reset weekly history?')) { resetWeeklyHistory(); setHistory([]); setMessage('Weekly history reset') } }} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#FEF2F2', color: '#991B1B' }}><RotateCcw size={14} className="inline mr-1" />Reset weekly history</button>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Capture Growth Snapshot</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={periodType} onChange={e => setPeriodType(e.target.value as GrowthPeriodType)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
              <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder={periodType === 'week' ? 'YYYY-Www' : 'YYYY-MM'} />
              <button onClick={handleCaptureGrowthSnapshot} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2A5298' }}>
                Save {periodType} stats
              </button>
              <button onClick={() => { resetGrowthStatsHistory(); setGrowthStats([]); setMessage('Growth snapshots reset') }} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                Reset saved stats
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <select value={reportType} onChange={e => setReportType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All report types</option>{reportTypes.map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={region} onChange={e => setRegion(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All regions</option>{regions.map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={subgroup} onChange={e => setSubgroup(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All subgroups</option>{subgroups.map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={groupOrCell} onChange={e => setGroupOrCell(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All cells / groups</option>{groups.map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={metric} onChange={e => setMetric(e.target.value as DashboardMetric)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">{METRICS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
            <select value={view} onChange={e => setView(e.target.value as DashboardView)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="overall">Overall</option><option value="regional">Regional</option><option value="subgroup">Subgroup</option><option value="cell/group">Cell / group</option></select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map(row => (
          <div key={row.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: '#0D2540' }}>{row.label}</div>
                <div className="text-xs text-slate-500">Current week {row.currentWeek || '—'} vs previous {row.previousWeek || '—'}</div>
              </div>
              <BarChart3 size={16} color="#2A5298" />
            </div>
            <div className="p-4 grid grid-cols-4 gap-3 text-center">
              <Stat label="Current" value={row.currentValue} />
              <Stat label="Previous" value={row.previousValue} />
              <Stat label="WoW diff" value={row.difference} />
              <Stat label="4-wk trend" value={Number(row.rollingAverage.toFixed(1))} />
            </div>
            <div className="px-4 pb-4">
              <MiniTrend values={row.rows.map(r => r.value)} labels={row.rows.map(r => r.weekLabel)} />
            </div>
            <table className="report-table">
              <thead><tr><th style={{ textAlign: 'left' }}>Week</th><th>Value</th></tr></thead>
              <tbody>
                {row.rows.map(r => <tr key={`${row.label}-${r.weekLabel}`}><td style={{ textAlign: 'left' }}>{r.weekLabel}</td><td>{r.value}</td></tr>)}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="section-hdr">Saved Growth Stats ({periodType})</div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {statsRows.map(row => (
            <div key={row.label} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="text-sm font-semibold" style={{ color: '#0D2540' }}>{row.label}</div>
                <BarChart3 size={16} color="#2A5298" />
              </div>
              <div className="p-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Current" value={row.currentValue} />
                <Stat label="Previous" value={row.previousValue} />
                <Stat label="Diff" value={row.difference} />
              </div>
              <div className="px-4 pb-4">
                <MiniTrend values={row.rows.map(r => r.value)} labels={row.rows.map(r => r.weekLabel)} />
              </div>
            </div>
          ))}
          {!statsRows.length ? <div className="text-sm text-slate-400">No saved growth stats yet. Save a week or month snapshot above.</div> : null}
        </div>
      </div>
    </div>
  )
}

function latestOverallSnapshot(items: WeeklySnapshot[], reportType: string) {
  const filtered = items
    .filter(item => item.reportType === reportType && !item.region && !item.subgroup && !item.groupOrCell)
    .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel))
  return filtered[filtered.length - 1] || null
}

function getIsoWeek(date: Date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function buildGrowthRows(items: GrowthStatSnapshot[]) {
  const ordered = [...items].sort((a, b) => a.periodLabel.localeCompare(b.periodLabel))
  const makeRow = (label: string, getValue: (item: GrowthStatSnapshot) => number) => {
    const rows = ordered.map(item => ({ weekLabel: item.periodLabel, value: getValue(item) }))
    const current = rows[rows.length - 1]
    const previous = rows[rows.length - 2]
    return {
      label,
      currentValue: Number(current?.value || 0),
      previousValue: Number(previous?.value || 0),
      difference: Number(current?.value || 0) - Number(previous?.value || 0),
      rows,
    }
  }
  return [
    makeRow('Follow-up Notes', item => item.notesCount),
    makeRow('First Timers', item => item.firstTimersCount),
    makeRow('Attendance Present', item => item.attendancePresent),
  ]
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat-card"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="text-2xl font-bold" style={{ color: '#0D2540' }}>{value}</p></div>
}

function MiniTrend({ values, labels }: { values: number[]; labels: string[] }) {
  const width = 360
  const height = 120
  if (!values.length) return <div className="text-sm text-slate-400">No trend data yet.</div>
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, index) => `${index * step},${height - (value / max) * (height - 20) - 10}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 rounded-xl" style={{ background: '#F8FAFC' }}>
      <polyline fill="none" stroke="#2A5298" strokeWidth="3" points={points} />
      {values.map((value, index) => (
        <g key={`${labels[index]}-${value}`}>
          <circle cx={index * step} cy={height - (value / max) * (height - 20) - 10} r="4" fill="#2A5298" />
          <text x={index * step} y={height - 4} fontSize="10" textAnchor="middle" fill="#64748B">{labels[index]}</text>
        </g>
      ))}
    </svg>
  )
}
