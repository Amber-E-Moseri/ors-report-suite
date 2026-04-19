'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AllFTData, FTHierarchyEntry, FTSubgroup, GroupDirectory, ParsedFTRow } from '@/types'
import { FT_SUBGROUPS } from '@/types'
import { formatDateRange, pctText } from '@/lib/parsers'
import { gradeLabel, healthBand, mobilizationRatio, weightedScore } from '@/lib/scoring'
import { normalizeFTSubgroup, toFollowUpSubgroup } from '@/lib/subgroup-aliases'
import { CalendarRange, Printer, RotateCcw, UserPlus } from 'lucide-react'
import { GroupsView } from '../views/GroupsView'
import { FTRegionalView } from '../views/FTRegionalView'
import { MiniStat, MiniStatPct } from '../ui/StatCards'
import { storedGroupsToDirectory, type StoredGroup } from '@/lib/group-store'
import { getExpectedRoster } from '@/lib/attendance/roster-storage'

interface Props {
  ftAllData: AllFTData
  storedGroups: StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onClearGroups: () => void
  onReset: () => void
  onBack: () => void
}

type FTTab = 'cell' | 'service' | 'overall-total' | 'meeting-attendance' | 'groups'
type FTView = 'subgroup' | 'regional'
type ConflictResolution = 'cell' | 'service' | 'both'
type AttendanceMap = Record<FTSubgroup, { expected: number; attended: number }>
type ConnectedRosterMap = Record<FTSubgroup, number>

interface ConflictState {
  resolutions: Record<string, ConflictResolution>
  status: 'pending' | 'resolved'
}

interface QualitySummary {
  unresolvedSubgroupRows: number
  unknownGroupRows: number
  subgroupMismatchRows: number
}

interface NormalizedHierarchy {
  bySubgroup: Record<FTSubgroup, FTHierarchyEntry>
  unresolvedSubgroupRows: number
}

const stickyHeaderStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
  background: 'white',
}

function mergeEntry(target: FTHierarchyEntry, source: FTHierarchyEntry): FTHierarchyEntry {
  const groups: Record<string, number> = { ...target.groups }
  for (const [group, count] of Object.entries(source.groups)) {
    groups[group] = (groups[group] ?? 0) + count
  }
  return { total: target.total + source.total, groups }
}

function normalizeHierarchyMap(hierarchyMap: Record<string, FTHierarchyEntry>): NormalizedHierarchy {
  const bySubgroup = Object.fromEntries(
    FT_SUBGROUPS.map((subgroup) => [subgroup, { total: 0, groups: {} }]),
  ) as Record<FTSubgroup, FTHierarchyEntry>
  let unresolvedSubgroupRows = 0

  for (const [subgroup, entry] of Object.entries(hierarchyMap)) {
    const canonical = normalizeFTSubgroup(subgroup)
    if (!canonical) {
      unresolvedSubgroupRows += entry.total
      continue
    }
    bySubgroup[canonical] = mergeEntry(bySubgroup[canonical], entry)
  }

  return { bySubgroup, unresolvedSubgroupRows }
}

function resolveGroupInfo(groupRaw: string, groupDir: GroupDirectory) {
  const candidates = [groupRaw, ...groupRaw.split(',').map((part) => part.trim())]
    .map((value) => value.trim())
    .filter(Boolean)

  for (const candidate of candidates) {
    const info = groupDir.byName.get(candidate)
    if (info) return info
  }

  return null
}

function toInitialAttendanceMap(): AttendanceMap {
  return Object.fromEntries(FT_SUBGROUPS.map((subgroup) => [subgroup, { expected: 0, attended: 0 }])) as AttendanceMap
}

function toInitialConnectedRosterMap(): ConnectedRosterMap {
  return Object.fromEntries(FT_SUBGROUPS.map((subgroup) => [subgroup, 0])) as ConnectedRosterMap
}

export function FTReportPanel({
  ftAllData,
  storedGroups,
  onGroupsChange,
  onClearGroups,
  onReset,
  onBack,
}: Props) {
  const { cellData, serviceData, globalMin, globalMax } = ftAllData
  const dateRange = formatDateRange(globalMin, globalMax)
  const groupDir = useMemo(() => storedGroupsToDirectory(storedGroups), [storedGroups])
  const hasConflicts = ftAllData.conflicts.length > 0

  const defaultTab: FTTab =
    cellData.grandTotal > 0 ? 'cell' : serviceData.grandTotal > 0 ? 'service' : 'overall-total'

  const [tab, setTab] = useState<FTTab>(defaultTab)
  const [view, setView] = useState<FTView>('subgroup')
  const [activeSubgroup, setActiveSubgroup] = useState<FTSubgroup>(FT_SUBGROUPS[0])
  const [attendance, setAttendance] = useState<AttendanceMap>(() => toInitialAttendanceMap())
  const [connectedRosterBySubgroup, setConnectedRosterBySubgroup] = useState<ConnectedRosterMap>(() => toInitialConnectedRosterMap())
  const [connectedRosterTotal, setConnectedRosterTotal] = useState(0)
  const [connectedRosterLoading, setConnectedRosterLoading] = useState(true)
  const [conflictState, setConflictState] = useState<ConflictState>(() => {
    const resolutions: Record<string, ConflictResolution> = {}
    for (const conflict of ftAllData.conflicts) {
      resolutions[conflict.fullName.toLowerCase()] = 'both'
    }
    return { resolutions, status: hasConflicts ? 'pending' : 'resolved' }
  })

  const resolvedCombinedData = useMemo(() => {
    if (!hasConflicts || conflictState.status === 'pending') {
      return ftAllData.combinedData
    }

    const seen = new Set<string>()
    const rows: ParsedFTRow[] = []

    for (const row of ftAllData.cellData.rows) {
      const key = row.fullName.trim().toLowerCase()
      const resolution = key ? (conflictState.resolutions[key] ?? 'both') : 'both'
      if (resolution === 'service') continue
      rows.push(row)
      if (key) seen.add(key)
    }

    for (const row of ftAllData.serviceData.rows) {
      const key = row.fullName.trim().toLowerCase()
      if (!key) {
        rows.push(row)
        continue
      }
      const resolution = conflictState.resolutions[key] ?? 'both'
      if (resolution === 'cell') continue
      if (resolution === 'both' && seen.has(key)) {
        rows.push(row)
        continue
      }
      if (!seen.has(key)) rows.push(row)
    }

    const hierarchyMap: Record<string, FTHierarchyEntry> = {}
    for (const row of rows) {
      const subKey = row.subgroup || '(No Subgroup)'
      const group = row.group || '(No Group)'
      if (!hierarchyMap[subKey]) hierarchyMap[subKey] = { total: 0, groups: {} }
      hierarchyMap[subKey].total += 1
      hierarchyMap[subKey].groups[group] = (hierarchyMap[subKey].groups[group] ?? 0) + 1
    }

    return { hierarchyMap, grandTotal: rows.length, rows }
  }, [ftAllData, conflictState, hasConflicts])

  const tabs: { id: FTTab; label: string; count?: number }[] = [
    { id: 'cell', label: 'Cell', count: cellData.grandTotal },
    { id: 'service', label: 'Service', count: serviceData.grandTotal },
    { id: 'overall-total', label: 'Overall Total', count: resolvedCombinedData.grandTotal },
    { id: 'meeting-attendance', label: 'Meeting Attendance' },
    { id: 'groups', label: 'Groups' },
  ]

  const activeData = tab === 'cell' ? cellData : tab === 'service' ? serviceData : resolvedCombinedData
  const baseUnresolvedRows =
    tab === 'cell'
      ? cellData.unmatchedRows
      : tab === 'service'
        ? serviceData.unmatchedRows
        : cellData.unmatchedRows + serviceData.unmatchedRows

  const normalizedHierarchy = useMemo(() => normalizeHierarchyMap(activeData.hierarchyMap), [activeData.hierarchyMap])
  const cellHierarchy = useMemo(() => normalizeHierarchyMap(cellData.hierarchyMap), [cellData.hierarchyMap])
  const serviceHierarchy = useMemo(() => normalizeHierarchyMap(serviceData.hierarchyMap), [serviceData.hierarchyMap])
  const combinedHierarchy = useMemo(
    () => normalizeHierarchyMap(resolvedCombinedData.hierarchyMap),
    [resolvedCombinedData.hierarchyMap],
  )

  const activeEntry = normalizedHierarchy.bySubgroup[activeSubgroup] ?? { total: 0, groups: {} }
  const cellEntry = cellHierarchy.bySubgroup[activeSubgroup] ?? { total: 0, groups: {} }
  const serviceEntry = serviceHierarchy.bySubgroup[activeSubgroup] ?? { total: 0, groups: {} }
  const combinedEntry = combinedHierarchy.bySubgroup[activeSubgroup] ?? { total: 0, groups: {} }

  const followUpSubgroup = toFollowUpSubgroup(activeSubgroup)
  const subgroupDirectory = followUpSubgroup
    ? groupDir.bySubgroup.get(followUpSubgroup) ?? { groups: [], totalMembers: 0, adjustedMembers: 0 }
    : { groups: [], totalMembers: 0, adjustedMembers: 0 }

  const qualitySummary = useMemo<QualitySummary>(() => {
    let unknownGroupRows = 0
    let subgroupMismatchRows = 0

    for (const ftRow of activeData.rows) {
      const canonical = normalizeFTSubgroup(ftRow.subgroup)
      if (canonical !== activeSubgroup) continue

      const groupInfo = resolveGroupInfo(ftRow.group, groupDir)
      if (!groupInfo) {
        unknownGroupRows += 1
        continue
      }
      if (followUpSubgroup && groupInfo.subgroup && groupInfo.subgroup !== followUpSubgroup) {
        subgroupMismatchRows += 1
      }
    }

    return {
      unresolvedSubgroupRows: baseUnresolvedRows + normalizedHierarchy.unresolvedSubgroupRows,
      unknownGroupRows,
      subgroupMismatchRows,
    }
  }, [
    activeData.rows,
    activeSubgroup,
    baseUnresolvedRows,
    followUpSubgroup,
    groupDir,
    normalizedHierarchy.unresolvedSubgroupRows,
  ])

  const activeGroups = Object.keys(activeEntry.groups).length
  const totalGroups = subgroupDirectory.groups.length
  const adjustedBase = subgroupDirectory.adjustedMembers
  const reachRatio = adjustedBase > 0 ? Math.max(0, Math.min(1, activeEntry.total / adjustedBase)) : 0
  const mobilization = mobilizationRatio(activeGroups, totalGroups)
  const effectivenessScore = weightedScore({
    reachRatio,
    mobilizationRatio: mobilization,
    reachWeight: 0.75,
    mobilizationWeight: 0.25,
  })
  const band = healthBand(effectivenessScore)
  const label = gradeLabel(effectivenessScore)

  const groupRows = Object.entries(activeEntry.groups).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const totalQualityIssues =
    qualitySummary.unresolvedSubgroupRows + qualitySummary.unknownGroupRows + qualitySummary.subgroupMismatchRows

  const subgroupAttendance = attendance[activeSubgroup]
  const attendanceReach = subgroupAttendance.expected > 0 ? subgroupAttendance.attended / subgroupAttendance.expected : 0
  const attendanceGroupsActive = Object.keys(combinedEntry.groups).length
  const attendanceMobilization = mobilizationRatio(attendanceGroupsActive, totalGroups)
  const connectedExpected = connectedRosterBySubgroup[activeSubgroup] ?? 0

  useEffect(() => {
    let cancelled = false

    async function loadConnectedRoster() {
      setConnectedRosterLoading(true)
      try {
        const roster = await getExpectedRoster()
        if (cancelled) return

        const counts = toInitialConnectedRosterMap()
        let total = 0

        for (const entry of roster) {
          if (!entry.active) continue
          const subgroup = normalizeFTSubgroup(entry.subgroup)
          if (!subgroup) continue
          counts[subgroup] += 1
          total += 1
        }

        setConnectedRosterBySubgroup(counts)
        setConnectedRosterTotal(total)
      } finally {
        if (!cancelled) setConnectedRosterLoading(false)
      }
    }

    void loadConnectedRoster()
    return () => {
      cancelled = true
    }
  }, [])

  if (conflictState.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="px-6 py-4 shadow-sm" style={{ background: 'var(--gradient-header)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <UserPlus size={20} color="#DCE9F8" />
              </div>
              <div>
                <h1 className="text-white font-bold text-xl tracking-tight">Resolve Duplicate Names</h1>
                <p className="text-sm mt-1" style={{ color: '#DCE9F8' }}>
                  These people appear in both Cell and Service CSVs. Choose how to count each one.
                </p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.10)', color: '#DCE9F8' }}
            >
              {'<- Back to Suite Home'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'left' }}>Cell Group</th>
                    <th style={{ textAlign: 'left' }}>Cell Subgroup</th>
                    <th style={{ textAlign: 'left' }}>Service Group</th>
                    <th style={{ textAlign: 'left' }}>Service Subgroup</th>
                    <th style={{ textAlign: 'left' }}>Count as</th>
                  </tr>
                </thead>
                <tbody>
                  {ftAllData.conflicts.map((conflict) => {
                    const key = conflict.fullName.toLowerCase()
                    const selected = conflictState.resolutions[key] ?? 'both'
                    return (
                      <tr key={key}>
                        <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                          {conflict.fullName}
                        </td>
                        <td>{conflict.cellGroup}</td>
                        <td>{conflict.cellSubgroup}</td>
                        <td>{conflict.serviceGroup}</td>
                        <td>{conflict.serviceSubgroup}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {([
                              { id: 'cell', label: 'Cell only' },
                              { id: 'service', label: 'Service only' },
                              { id: 'both', label: 'Both' },
                            ] as Array<{ id: ConflictResolution; label: string }>).map((option) => (
                              <button
                                key={option.id}
                                onClick={() =>
                                  setConflictState((prev) => ({
                                    ...prev,
                                    resolutions: { ...prev.resolutions, [key]: option.id },
                                  }))
                                }
                                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={
                                  selected === option.id
                                    ? { background: 'var(--brand-mid)', color: '#fff' }
                                    : { background: 'var(--brand-pale)', color: 'var(--brand-dark)' }
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setConflictState((prev) => ({ ...prev, status: 'resolved' }))}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--brand-mid)' }}
              >
                Apply & View Report
              </button>
              <button
                onClick={() => {
                  const allBoth: Record<string, ConflictResolution> = {}
                  for (const conflict of ftAllData.conflicts) {
                    allBoth[conflict.fullName.toLowerCase()] = 'both'
                  }
                  setConflictState({ resolutions: allBoth, status: 'resolved' })
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}
              >
                Skip - count all as Both
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 shadow-sm" style={{ background: 'var(--gradient-header)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <UserPlus size={20} color="#DCE9F8" />
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
                  First Timers
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#F8FBFF' }}
                >
                  <CalendarRange size={13} />
                  {dateRange}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 report-actions">
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
          {tabs.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
              style={{
                background: tab === entry.id ? '#F5F8FC' : 'transparent',
                color: tab === entry.id ? 'var(--brand-darkest)' : '#90AACC',
                borderBottom: tab === entry.id ? '2px solid var(--brand-dark)' : 'none',
                marginBottom: tab === entry.id ? '-2px' : '0',
              }}
            >
              {entry.label}
              {typeof entry.count === 'number' ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                  style={{ background: tab === entry.id ? '#5346B8' : 'rgba(255,255,255,0.12)', color: '#fff' }}
                >
                  {entry.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab !== 'groups' && (
          <div className="px-6 py-2.5 flex items-center gap-2 flex-wrap">
            {tab !== 'meeting-attendance' && (
              <>
                {(['regional', 'subgroup'] as FTView[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setView(option)}
                    className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                    style={{
                      background: view === option ? '#F5F8FC' : 'transparent',
                      color: view === option ? 'var(--brand-darkest)' : '#90AACC',
                      border: view === option ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                    }}
                  >
                    {option === 'regional' ? 'Regional View' : 'Subgroup View'}
                  </button>
                ))}
              </>
            )}
            {(tab === 'meeting-attendance' || view === 'subgroup') && (
              <>
                <span className="text-xs font-semibold ml-1" style={{ color: '#90AACC' }}>
                  Subgroup:
                </span>
                <select
                  value={activeSubgroup}
                  onChange={(event) => setActiveSubgroup(event.target.value as FTSubgroup)}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: '#fff',
                    borderRadius: 6,
                    color: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.30)',
                  }}
                >
                  {FT_SUBGROUPS.map((subgroup) => (
                    <option key={subgroup} value={subgroup}>
                      {subgroup}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      <main className="flex-1 overflow-auto p-6">
        {tab === 'groups' ? (
          <GroupsView groups={storedGroups} onChange={onGroupsChange} onClearAll={onClearGroups} />
        ) : (
          <div
            className={
              tab !== 'meeting-attendance' && view === 'regional'
                ? 'fade-in space-y-5'
                : 'fade-in max-w-4xl mx-auto space-y-5'
            }
          >
            {hasConflicts && conflictState.status === 'resolved' && (
              <div
                className="flex items-center justify-between px-4 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#E4EEF9', color: '#1B3E6B', border: '1px solid #C0D8F0' }}
              >
                <span>
                  {ftAllData.conflicts.length} duplicate name{ftAllData.conflicts.length !== 1 ? 's' : ''} resolved.{' '}
                  {Object.values(conflictState.resolutions).filter((resolution) => resolution !== 'both').length > 0
                    ? `${Object.values(conflictState.resolutions).filter((resolution) => resolution !== 'both').length} counted once.`
                    : 'All counted in both Cell and Service.'}
                </span>
                <button
                  onClick={() => setConflictState((prev) => ({ ...prev, status: 'pending' }))}
                  className="underline text-xs ml-4"
                  style={{ color: '#2A5298' }}
                >
                  Review
                </button>
              </div>
            )}

            {!(tab !== 'meeting-attendance' && view === 'regional') && (
              <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
                <h1 className="text-xl font-bold tracking-tight">{activeSubgroup}</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
                  {dateRange}
                </p>
              </div>
            )}

            {tab !== 'meeting-attendance' && view === 'regional' ? (
              <FTRegionalView ftAllData={{ ...ftAllData, combinedData: resolvedCombinedData }} />
            ) : tab === 'meeting-attendance' ? (
              <>
                <Section title="MEETING ATTENDANCE (SUPABASE CONNECTED)">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--brand-dark)' }}>
                      Connected to expected roster in Supabase.
                    </p>
                    <button
                      onClick={async () => {
                        setConnectedRosterLoading(true)
                        const roster = await getExpectedRoster()
                        const counts = toInitialConnectedRosterMap()
                        let total = 0
                        for (const entry of roster) {
                          if (!entry.active) continue
                          const subgroup = normalizeFTSubgroup(entry.subgroup)
                          if (!subgroup) continue
                          counts[subgroup] += 1
                          total += 1
                        }
                        setConnectedRosterBySubgroup(counts)
                        setConnectedRosterTotal(total)
                        setConnectedRosterLoading(false)
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Connected Expected" value={connectedRosterLoading ? '...' : connectedExpected} />
                    <MiniStat label="Roster Active (All)" value={connectedRosterLoading ? '...' : connectedRosterTotal} />
                    <MiniStat label="Subgroup" value={activeSubgroup} />
                  </div>
                </Section>

                <Section title="MEETING ATTENDANCE (DUPLICATE MANUAL ENTRY)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand-dark)' }}>
                      Expected
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={subgroupAttendance.expected}
                      onChange={(event) => {
                        const next = Math.max(0, Number(event.target.value) || 0)
                        setAttendance((prev) => ({
                          ...prev,
                          [activeSubgroup]: { ...prev[activeSubgroup], expected: next },
                        }))
                      }}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      style={{ color: '#0F172A', background: '#fff' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand-dark)' }}>
                      Attended
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={subgroupAttendance.attended}
                      onChange={(event) => {
                        const next = Math.max(0, Number(event.target.value) || 0)
                        setAttendance((prev) => ({
                          ...prev,
                          [activeSubgroup]: { ...prev[activeSubgroup], attended: next },
                        }))
                      }}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      style={{ color: '#0F172A', background: '#fff' }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStatPct label="Reach %" value={pctText(attendanceReach)} band={healthBand(attendanceReach * 100)} />
                  <MiniStatPct
                    label="Mobilization %"
                    value={pctText(attendanceMobilization)}
                    band={healthBand(attendanceMobilization * 100)}
                  />
                  <MiniStat label="Adjusted Base" value={adjustedBase} />
                </div>
                </Section>
              </>
            ) : (
              <>
                <Section title="FIRST-TIMER SUMMARY">
                  {tab === 'overall-total' ? (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <MiniStat label="Cell FT" value={cellEntry.total} />
                      <MiniStat label="Service FT" value={serviceEntry.total} />
                      <MiniStat label="Total" value={combinedEntry.total} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <MiniStat label="FT Total" value={activeEntry.total} />
                      <MiniStat label="Active Groups" value={activeGroups} />
                      <MiniStat label="Total Groups" value={totalGroups} />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStatPct label="Reach %" value={pctText(reachRatio)} band={band} />
                    <MiniStatPct label="Mobilization %" value={pctText(mobilization)} band={band} />
                    <MiniStat label="Adjusted Base" value={adjustedBase} />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-dark)' }}>
                      Grade
                    </span>
                    <span className="grade-badge text-2xl" style={{ background: band.bg, color: band.fg, minWidth: 56, height: 44 }}>
                      {label}
                    </span>
                  </div>
                </Section>

                <Section title="GROUP BREAKDOWN">
                  {groupRows.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">(No group records for this subgroup)</p>
                  ) : (
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th style={{ ...stickyHeaderStyle, textAlign: 'left' }}>Group</th>
                          <th style={stickyHeaderStyle}>FT Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupRows.map(([group, count]) => (
                          <tr key={group}>
                            <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                              {group}
                            </td>
                            <td>{count}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>TOTAL</td>
                          <td>{activeEntry.total}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </Section>

                {totalQualityIssues > 0 && (
                  <Section title="DATA QUALITY">
                    <div
                      className="rounded-lg border px-4 py-3 text-sm"
                      style={{ borderColor: '#F6D860', background: '#FFF4CC', color: '#7A5A00' }}
                    >
                      <p>{qualitySummary.unresolvedSubgroupRows} unresolved subgroup row(s)</p>
                      <p>{qualitySummary.unknownGroupRows} unknown group row(s)</p>
                      <p>{qualitySummary.subgroupMismatchRows} subgroup mismatch row(s)</p>
                    </div>
                  </Section>
                )}
              </>
            )}
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
