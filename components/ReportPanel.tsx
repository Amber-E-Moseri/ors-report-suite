'use client'

import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { GroupDirectory, NotesData, AllFTData, FollowUpSubgroup } from '@/types'
import { FOLLOW_UP_SUBGROUPS } from '@/types'
import {
  computeSubgroupReport, computeRegionalRows, computeLeaderRanks,
} from '@/lib/compute-reports'
import { RegionalView }  from './views/RegionalView'
import { SubgroupView }  from './views/SubgroupView'
import { LeaderView }    from './views/LeaderView'
import { FTRegionalView } from './views/FTRegionalView'
import { GroupsView } from './views/GroupsView'
import { LayoutGrid, Users, Star, UserPlus, RotateCcw, Printer, FolderOpen, ShieldCheck, CalendarRange } from 'lucide-react'
import type { StoredGroup } from '@/lib/group-store'

interface Props {
  groupDir:       GroupDirectory
  notesData:      NotesData
  ftAllData:      AllFTData | null
  storedGroups:   StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onClearGroups:  () => void
  onReset:        () => void
  onBack:         () => void
}

type Tab = 'regional' | 'subgroup' | 'leaders' | 'ft-regional' | 'groups'

function safeCompute<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export function ReportPanel({ groupDir, notesData, ftAllData, storedGroups, onGroupsChange, onClearGroups, onReset, onBack }: Props) {
  const [tab,        setTab]        = useState<Tab>('regional')
  const [activeSubgroup, setActive] = useState<FollowUpSubgroup>(FOLLOW_UP_SUBGROUPS[0])
  const [grade,      setGrade]      = useState(true)
  const [colourPct,  setColourPct]  = useState(true)

  const regionalRows = useMemo(
    () => safeCompute(() => computeRegionalRows(groupDir, notesData), []),
    [groupDir, notesData],
  )

  const subgroupData = useMemo(
    () => safeCompute(
      () => computeSubgroupReport(activeSubgroup, groupDir, notesData, ftAllData),
      null,
    ),
    [activeSubgroup, groupDir, notesData, ftAllData],
  )

  const leaderRanks = useMemo(
    () => safeCompute(() => computeLeaderRanks(notesData), []),
    [notesData],
  )

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'regional',    label: 'Regional Overview', icon: <LayoutGrid size={15} /> },
    { id: 'subgroup',    label: 'Subgroup Report',   icon: <Users size={15} /> },
    { id: 'leaders',     label: 'Leader Counter',    icon: <Star size={15} /> },
    ...(ftAllData ? [{ id: 'ft-regional' as Tab, label: 'FT Regional', icon: <UserPlus size={15} /> }] : []),
    { id: 'groups',      label: 'Groups',            icon: <FolderOpen size={15} /> },
  ]

  const activeTabLabel = tabs.find(t => t.id === tab)?.label ?? 'Report'
  const generatedAt = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header
        className="px-6 py-4 shadow-sm"
        style={{ background: 'linear-gradient(135deg, var(--brand-darkest) 0%, var(--brand-dark) 100%)' }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <ShieldCheck size={20} color="#DCE9F8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-white font-bold text-xl tracking-tight">ORS Report Suite</h1>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ borderColor: 'rgba(208,224,244,0.22)', color: 'var(--brand-period)', background: 'rgba(255,255,255,0.05)' }}
                >
                  Analytics
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: '#DCE9F8' }}>
                Clean ORS reporting with clearer summaries, polished exports, and faster review flow.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#F8FBFF' }}
                >
                  <CalendarRange size={13} />
                  {notesData.rangeText}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#DCE9F8' }}
                >
                  Active view: {activeTabLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          {/* Grade toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-300 font-medium">Grade</span>
            <button
              onClick={() => setGrade(g => !g)}
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
                onClick={() => setColourPct(c => !c)}
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
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'var(--brand-dark)', color: '#fff' }}
          >
            <Printer size={12} />
            Print / PDF
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.10)', color: '#DCE9F8' }}
          >
            ← Suite Home
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

      {/* Tab bar */}
      <div data-tab-bar style={{ background: 'var(--brand-dark)', borderBottom: '2px solid var(--brand-mid)' }}>
        <div className="flex items-end gap-1 px-6 pt-3 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
              style={{
                background: tab === t.id ? '#F5F8FC' : 'transparent',
                color: tab === t.id ? 'var(--brand-darkest)' : '#A8C4E0',
                borderBottom: tab === t.id ? '2px solid var(--brand-mid)' : 'none',
                marginBottom: tab === t.id ? '-2px' : '0',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {/* Subgroup selector — separate row when on subgroup tab */}
        {tab === 'subgroup' && (
          <div className="px-6 pb-2 pt-1 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--brand-period)' }}>Subgroup:</span>
            <select
              value={activeSubgroup}
              onChange={e => setActive(e.target.value as FollowUpSubgroup)}
              className="text-xs px-3 py-1.5 rounded border font-medium"
              style={{
                background: 'var(--brand-darkest)',
                color: '#fff',
                borderColor: 'var(--brand-mid)',
              }}
            >
              {FOLLOW_UP_SUBGROUPS.map(sg => (
                <option key={sg} value={sg}>{sg}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <section className="print-suite-header hidden mb-6 rounded-2xl border p-5 print:block" style={{ borderColor: '#D7E4F5', background: 'linear-gradient(180deg, #F7FAFE 0%, #EEF4FB 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--brand-mid)' }}>
                ORS Analytics Export
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-darkest)' }}>
                ORS Report Suite
              </h1>
              <p className="mt-1 text-sm" style={{ color: '#36577F' }}>
                {activeTabLabel}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand-dark)' }}>Period</p>
              <p className="mt-1" style={{ color: '#36577F' }}>{notesData.rangeText}</p>
              <p className="mt-2 font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand-dark)' }}>Generated</p>
              <p className="mt-1" style={{ color: '#36577F' }}>{generatedAt}</p>
            </div>
          </div>
        </section>
        {tab === 'regional' && (
          <RegionalView rows={regionalRows} grade={grade} colourPct={colourPct} rangeText={notesData.rangeText} />
        )}

        {tab === 'subgroup' && subgroupData && (
          <SubgroupView data={subgroupData} grade={grade} colourPct={colourPct} />
        )}
        {tab === 'subgroup' && !subgroupData && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400 italic text-sm">
            Unable to compute subgroup report. Check that your CSV files have the expected columns.
          </div>
        )}
        {tab === 'leaders' && (
          <LeaderView ranks={leaderRanks} />
        )}
        {tab === 'ft-regional' && ftAllData && (
          <FTRegionalView ftAllData={ftAllData} />
        )}
        {tab === 'groups' && (
          <GroupsView groups={storedGroups} onChange={onGroupsChange} onClearAll={onClearGroups} />
        )}
      </main>
    </div>
  )
}
