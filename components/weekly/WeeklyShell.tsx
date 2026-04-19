'use client'

import { useState, useCallback } from 'react'
import { WeeklyUploadPanel } from './WeeklyUploadPanel'
import { ReportPanel } from '../ReportPanel'
import type { GroupDirectory, NotesData, AllFTData } from '@/types'
import { aggregateNotes, parseFTRows, buildAllFTData } from '@/lib/parsers'
import { parseCSVFile } from '@/lib/csv-parser'
import { loadStoredGroups, storedGroupsToDirectory, type StoredGroup } from '@/lib/group-store'
import { makeSnapshotId, upsertWeeklySnapshots } from '@/lib/history/snapshot-storage'
import { subgroupRegion, toFTSubgroup } from '@/lib/subgroup-aliases'

type RawRow = Record<string, unknown>

type WeeklyState =
  | { phase: 'upload' }
  | { phase: 'loading'; message: string }
  | { phase: 'reports'; rawNotesRows: RawRow[]; groupDir: GroupDirectory; notesData: NotesData; ftAllData: AllFTData | null; groups: StoredGroup[] }
  | { phase: 'error'; message: string }

interface Props {
  storedGroups: StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onBack: () => void
}

export function WeeklyShell({ storedGroups, onGroupsChange, onBack }: Props) {
  const [state, setState] = useState<WeeklyState>({ phase: 'upload' })

  const loadStoredGroupsWithTimeout = useCallback(async () => {
    const timeoutMs = 8000
    try {
      return await Promise.race<StoredGroup[]>([
        loadStoredGroups(),
        new Promise<StoredGroup[]>((resolve) => {
          setTimeout(() => resolve([]), timeoutMs)
        }),
      ])
    } catch {
      return []
    }
  }, [])

  const handleFilesReady = useCallback(async (
    notesFile: File | null,
    cellFTFile: File | null,
    serviceFTFile: File | null,
  ) => {
    setState({ phase: 'loading', message: 'Parsing files and loading group data...' })

    try {
      const notesRows = notesFile ? await parseCSVFile(notesFile) as RawRow[] : []
      const supabaseGroups = await loadStoredGroupsWithTimeout()
      const activeGroups = supabaseGroups.length > 0 ? supabaseGroups : storedGroups
      onGroupsChange(activeGroups)

      const groupDir = activeGroups.length > 0
        ? storedGroupsToDirectory(activeGroups)
        : { byName: new Map(), bySubgroup: new Map() }

      const notesData = aggregateNotes(notesRows, groupDir.byName)

      let ftAllData: AllFTData | null = null
      if (cellFTFile || serviceFTFile) {
        const cellRows = cellFTFile ? await parseCSVFile(cellFTFile) as RawRow[] : []
        const serviceRows = serviceFTFile ? await parseCSVFile(serviceFTFile) as RawRow[] : []
        ftAllData = buildAllFTData(parseFTRows(cellRows), parseFTRows(serviceRows))
      }

      const weekLabel = new Date().toISOString().slice(0, 10)
      upsertWeeklySnapshots([
        {
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'weekly', region: '', subgroup: '', groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'weekly',
          region: '', subgroup: '', groupOrCell: '',
          notesCount: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.totalNotes, 0),
          peopleContacted: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.people.size, 0),
          activeGroups: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.groupsActive.size, 0),
          activeLeaders: notesData.byLeader.size,
          firstTimersCount: ftAllData?.combinedData.grandTotal || 0,
          attendanceExpected: 0, attendancePresent: 0, attendanceAbsent: 0, visitorsCount: 0,
        },
        ...Array.from(notesData.bySubgroup.entries()).map(([subgroup, agg]) => ({
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'weekly', region: subgroupRegion(subgroup), subgroup, groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'weekly',
          region: subgroupRegion(subgroup), subgroup, groupOrCell: '',
          notesCount: agg.totalNotes,
          peopleContacted: agg.people.size,
          activeGroups: agg.groupsActive.size,
          activeLeaders: notesData.byLeader.get(subgroup)?.size || 0,
          firstTimersCount: (() => {
            const ftSubgroup = toFTSubgroup(subgroup)
            if (!ftSubgroup) return 0
            return ftAllData?.combinedData.hierarchyMap[ftSubgroup]?.total || 0
          })(),
          attendanceExpected: 0, attendancePresent: 0, attendanceAbsent: 0, visitorsCount: 0,
        })),
      ])

      setState({ phase: 'reports', rawNotesRows: notesRows, groupDir, notesData, ftAllData, groups: activeGroups })
    } catch (err: unknown) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'An unexpected error occurred while parsing your files.' })
    }
  }, [storedGroups, onGroupsChange, loadStoredGroupsWithTimeout])

  const handleGroupsChange = useCallback((groups: StoredGroup[]) => {
    onGroupsChange(groups)
    setState(prev => {
      if (prev.phase !== 'reports') return prev
      const groupDir = storedGroupsToDirectory(groups)
      const notesData = aggregateNotes(prev.rawNotesRows, groupDir.byName)
      return { ...prev, groupDir, notesData, groups }
    })
  }, [onGroupsChange])

  const handleClearGroups = useCallback(() => {
    onGroupsChange([])
    setState(prev => {
      if (prev.phase !== 'reports') return prev
      const groupDir = { byName: new Map(), bySubgroup: new Map() }
      const notesData = aggregateNotes(prev.rawNotesRows, groupDir.byName)
      return { ...prev, groupDir, notesData, groups: [] }
    })
  }, [onGroupsChange])

  const handleReset = useCallback(() => setState({ phase: 'upload' }), [])

  if (state.phase === 'upload') {
    return <WeeklyUploadPanel onReady={handleFilesReady} onBack={onBack} />
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 mx-auto spin" style={{ borderColor: 'var(--brand-mid)', borderTopColor: 'transparent' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>Working</h2>
          <p className="text-sm text-slate-500">{state.message}</p>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">!</div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>Failed to process files</h2>
          <p className="text-sm text-slate-500">{state.message}</p>
          <button onClick={handleReset} className="mt-4 px-6 py-2 rounded-lg font-semibold text-sm text-white" style={{ background: 'var(--brand-mid)' }}>Try Again</button>
        </div>
      </div>
    )
  }

  return <ReportPanel groupDir={state.groupDir} notesData={state.notesData} ftAllData={state.ftAllData} storedGroups={state.groups} onGroupsChange={handleGroupsChange} onClearGroups={handleClearGroups} onReset={handleReset} onBack={onBack} />
}
