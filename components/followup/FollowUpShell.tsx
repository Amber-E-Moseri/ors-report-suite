'use client'

import { useState, useCallback, useEffect } from 'react'
import { FollowUpUploadPanel } from './FollowUpUploadPanel'
import { FollowUpReportPanel } from './FollowUpReportPanel'
import type { NotesData } from '@/types'
import { aggregateNotes } from '@/lib/parsers'
import { parseCSVFile } from '@/lib/csv-parser'
import { loadStoredGroups, storedGroupsToDirectory, type StoredGroup } from '@/lib/group-store'
import { makeSnapshotId, upsertWeeklySnapshots } from '@/lib/history/snapshot-storage'
import { subgroupRegion } from '@/lib/subgroup-aliases'
import { loadFUSession, saveFUSession, clearFUSession } from '@/lib/report-session-storage'

type RawRow = Record<string, unknown>

type FUState =
  | { phase: 'upload' }
  | { phase: 'loading'; message: string }
  | { phase: 'report'; notesData: NotesData; groupDir: ReturnType<typeof storedGroupsToDirectory> }
  | { phase: 'error'; message: string }

interface Props {
  storedGroups: StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onBack: () => void
}

export function FollowUpShell({ storedGroups, onGroupsChange, onBack }: Props) {
  const [state, setState] = useState<FUState>(() => {
    const cached = loadFUSession()
    if (!cached) return { phase: 'upload' }
    return {
      phase: 'report',
      notesData: cached,
      groupDir: storedGroupsToDirectory(storedGroups),
    }
  })

  useEffect(() => {
    setState((prev) => {
      if (prev.phase !== 'report') return prev
      return { ...prev, groupDir: storedGroupsToDirectory(storedGroups) }
    })
  }, [storedGroups])

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

  const handleFilesReady = useCallback(async (notesFile: File) => {
    setState({ phase: 'loading', message: 'Parsing files and loading group data...' })

    try {
      const supabaseGroups = await loadStoredGroupsWithTimeout()
      const activeGroups = supabaseGroups.length > 0 ? supabaseGroups : storedGroups
      onGroupsChange(activeGroups)

      const groupDir = activeGroups.length > 0
        ? storedGroupsToDirectory(activeGroups)
        : { byName: new Map(), bySubgroup: new Map() }

      const notesRows = await parseCSVFile(notesFile) as RawRow[]
      const notesData = aggregateNotes(notesRows, groupDir.byName)
      saveFUSession(notesData)

      const weekLabel = new Date().toISOString().slice(0, 10)
      upsertWeeklySnapshots([
        {
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'followup', region: '', subgroup: '', groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'followup',
          region: '',
          subgroup: '',
          groupOrCell: '',
          notesCount: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.totalNotes, 0),
          peopleContacted: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.people.size, 0),
          activeGroups: Array.from(notesData.bySubgroup.values()).reduce((sum, agg) => sum + agg.groupsActive.size, 0),
          activeLeaders: notesData.byLeader.size,
          firstTimersCount: 0,
          attendanceExpected: 0,
          attendancePresent: 0,
          attendanceAbsent: 0,
          visitorsCount: 0,
        },
        ...Array.from(notesData.bySubgroup.entries()).map(([subgroup, agg]) => ({
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'followup', region: subgroupRegion(subgroup), subgroup, groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'followup',
          region: subgroupRegion(subgroup),
          subgroup,
          groupOrCell: '',
          notesCount: agg.totalNotes,
          peopleContacted: agg.people.size,
          activeGroups: agg.groupsActive.size,
          activeLeaders: notesData.byLeader.get(subgroup)?.size || 0,
          firstTimersCount: 0,
          attendanceExpected: 0,
          attendancePresent: 0,
          attendanceAbsent: 0,
          visitorsCount: 0,
        })),
      ])

      setState({ phase: 'report', notesData, groupDir })
    } catch (err: unknown) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Failed to parse files.' })
    }
  }, [onGroupsChange, storedGroups, loadStoredGroupsWithTimeout])

  const handleReset = useCallback(() => {
    clearFUSession()
    setState({ phase: 'upload' })
  }, [])

  if (state.phase === 'upload') {
    return <FollowUpUploadPanel onReady={handleFilesReady} onBack={onBack} />
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div
            className="w-10 h-10 rounded-full border-4 mx-auto spin"
            style={{ borderColor: 'var(--brand-mid)', borderTopColor: 'transparent' }}
          />
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>Working</h2>
          <p className="text-sm text-slate-500">{state.message}</p>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">!</div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>Failed to process files</h2>
          <p className="text-sm text-slate-500">{state.message}</p>
          <button onClick={handleReset} className="px-6 py-2 rounded-lg font-semibold text-sm text-white" style={{ background: 'var(--brand-mid)' }}>Try Again</button>
        </div>
      </div>
    )
  }

  return <FollowUpReportPanel notesData={state.notesData} groupDir={state.groupDir} onReset={handleReset} onBack={onBack} />
}
