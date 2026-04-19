'use client'

import { useState, useCallback } from 'react'
import { FTUploadPanel } from './FTUploadPanel'
import { FTReportPanel } from './FTReportPanel'
import type { AllFTData } from '@/types'
import { parseFTRows, buildAllFTData } from '@/lib/parsers'
import { parseCSVFile } from '@/lib/csv-parser'
import { type StoredGroup } from '@/lib/group-store'
import { makeSnapshotId, upsertWeeklySnapshots } from '@/lib/history/snapshot-storage'
import { subgroupRegion } from '@/lib/subgroup-aliases'
import { loadFTSession, saveFTSession, clearFTSession } from '@/lib/report-session-storage'

type RawRow = Record<string, unknown>

type FTState =
  | { phase: 'upload' }
  | { phase: 'loading'; message: string }
  | { phase: 'report'; ftAllData: AllFTData }
  | { phase: 'error'; message: string }

interface Props {
  storedGroups: StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onBack: () => void
}

export function FTShell({ storedGroups, onGroupsChange, onBack }: Props) {
  const [state, setState] = useState<FTState>(() => {
    const cached = loadFTSession()
    return cached ? { phase: 'report', ftAllData: cached } : { phase: 'upload' }
  })

  const handleFilesReady = useCallback(async (
    cellFTFile: File | null,
    serviceFTFile: File | null,
  ) => {
    setState({ phase: 'loading', message: 'Parsing files and loading group data...' })

    try {
      const cellRows = cellFTFile ? await parseCSVFile(cellFTFile) as RawRow[] : []
      const serviceRows = serviceFTFile ? await parseCSVFile(serviceFTFile) as RawRow[] : []
      const ftAllData = buildAllFTData(parseFTRows(cellRows), parseFTRows(serviceRows))
      saveFTSession(ftAllData)

      const weekLabel = new Date().toISOString().slice(0, 10)
      upsertWeeklySnapshots([
        {
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'ft', region: '', subgroup: '', groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'ft',
          region: '',
          subgroup: '',
          groupOrCell: '',
          notesCount: 0,
          peopleContacted: 0,
          activeGroups: 0,
          activeLeaders: 0,
          firstTimersCount: ftAllData.combinedData.grandTotal,
          attendanceExpected: 0,
          attendancePresent: 0,
          attendanceAbsent: 0,
          visitorsCount: 0,
        },
        ...Object.entries(ftAllData.combinedData.hierarchyMap).map(([subgroup, entry]) => ({
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'ft', region: subgroupRegion(subgroup), subgroup, groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'ft',
          region: subgroupRegion(subgroup),
          subgroup,
          groupOrCell: '',
          notesCount: 0,
          peopleContacted: 0,
          activeGroups: 0,
          activeLeaders: 0,
          firstTimersCount: entry.total,
          attendanceExpected: 0,
          attendancePresent: 0,
          attendanceAbsent: 0,
          visitorsCount: 0,
        })),
      ])

      setState({ phase: 'report', ftAllData })
    } catch (err: unknown) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Failed to parse files.' })
    }
  }, [])

  const handleGroupsChange = useCallback((groups: StoredGroup[]) => {
    onGroupsChange(groups)
  }, [onGroupsChange])

  const handleClearGroups = useCallback(() => {
    onGroupsChange([])
  }, [onGroupsChange])

  const handleReset = useCallback(() => {
    clearFTSession()
    setState({ phase: 'upload' })
  }, [])

  if (state.phase === 'upload') {
    return <FTUploadPanel onReady={handleFilesReady} onBack={onBack} />
  }

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
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

  return (
    <FTReportPanel
      ftAllData={state.ftAllData}
      storedGroups={storedGroups}
      onGroupsChange={handleGroupsChange}
      onClearGroups={handleClearGroups}
      onReset={handleReset}
      onBack={onBack}
    />
  )
}
