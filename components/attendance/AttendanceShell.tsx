'use client'

import { useState, useCallback, useEffect } from 'react'
import { AttendanceUploadPanel } from './AttendanceUploadPanel'
import { AttendanceReportPanel } from './AttendanceReportPanel'
import { UnmatchedAttendeeReview } from './UnmatchedAttendeeReview'
import type { AttendanceModel } from '@/lib/attendance/attendance-parser'
import { parseElvantoAttendanceCSV, buildAttendanceModel } from '@/lib/attendance/attendance-parser'
import { parseCSVFile } from '@/lib/csv-parser'
import { buildUnmatchedReviewItems, unmatchedToRosterEntry, type UnmatchedReviewItem, type UnmatchedAction } from '@/lib/attendance/unmatched-review'
import { getExpectedRoster, setExpectedRoster } from '@/lib/attendance/roster-storage'
import { makeSnapshotId, upsertWeeklySnapshots, type WeeklySnapshot } from '@/lib/history/snapshot-storage'

type RawRow = Record<string, unknown>

type AttState =
  | { phase: 'upload' }
  | { phase: 'report'; model: AttendanceModel; unmatched: UnmatchedReviewItem[]; message: string }
  | { phase: 'error'; message: string }

interface Props {
  onBack: () => void
}

function weekLabelFromDate(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function regionFromSubgroup(subgroup: string) {
  if (subgroup.includes('West')) return 'West'
  if (subgroup.includes('Central-East') || subgroup.includes('Central East')) return 'Central East'
  if (subgroup.includes('Central')) return 'Central'
  return ''
}

export function AttendanceShell({ onBack }: Props) {
  const [state, setState] = useState<AttState>({ phase: 'upload' })
  const [savedRosterCount, setSavedRosterCount] = useState(0)

  useEffect(() => {
    void (async () => {
      const roster = await getExpectedRoster()
      setSavedRosterCount(roster.length)
    })()
  }, [])

  const handleFilesReady = useCallback(async (elvantoFile: File) => {
    try {
      const elvantoRows = await parseCSVFile(elvantoFile) as RawRow[]
      const rosterEntries = await getExpectedRoster()
      const activeRoster = rosterEntries.filter(entry => entry.active)

      if (!activeRoster.length) {
        setState({ phase: 'error', message: 'No active attendance roster found. Add rows in Settings > Attendance Roster, then retry.' })
        return
      }

      const roster = activeRoster.map(entry => ({
        fullName: entry.fullName,
        matchKey: entry.matchKey,
        subgroup: entry.subgroup,
        rawSubgroup: entry.subgroup,
      }))

      const { attendeeRows, log: elvantoLog } = parseElvantoAttendanceCSV(elvantoRows)
      const model = buildAttendanceModel(roster, attendeeRows, [...elvantoLog])
      const unmatched = buildUnmatchedReviewItems(attendeeRows, roster)
      const message = 'Attendance report generated. Weekly snapshot saved.'
      const weekLabel = weekLabelFromDate()

      const snapshots: WeeklySnapshot[] = [
        {
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'attendance', region: '', subgroup: '', groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'attendance',
          region: '',
          subgroup: '',
          groupOrCell: '',
          notesCount: 0,
          peopleContacted: 0,
          activeGroups: 0,
          activeLeaders: 0,
          firstTimersCount: 0,
          attendanceExpected: model.totalExpected,
          attendancePresent: model.totalPresent,
          attendanceAbsent: model.totalAbsent,
          visitorsCount: 0,
        },
        ...model.subgroupSummary.map(summary => ({
          snapshotId: makeSnapshotId({ weekLabel, reportType: 'attendance', region: regionFromSubgroup(summary.subgroup), subgroup: summary.subgroup, groupOrCell: '' }),
          weekLabel,
          reportDate: new Date().toISOString(),
          reportType: 'attendance',
          region: regionFromSubgroup(summary.subgroup),
          subgroup: summary.subgroup,
          groupOrCell: '',
          notesCount: 0,
          peopleContacted: 0,
          activeGroups: 0,
          activeLeaders: 0,
          firstTimersCount: 0,
          attendanceExpected: summary.expected,
          attendancePresent: summary.present,
          attendanceAbsent: summary.absent,
          visitorsCount: 0,
        })),
      ]
      upsertWeeklySnapshots(snapshots)
      setState({ phase: 'report', model, unmatched, message })
    } catch (err: unknown) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Failed to parse files.' })
    }
  }, [])

  function handleChangeUnmatchedAction(id: string, action: UnmatchedAction) {
    setState(prev => prev.phase !== 'report' ? prev : { ...prev, unmatched: prev.unmatched.map(item => item.id === id ? { ...item, action } : item) })
  }

  function markAllVisitors() {
    setState(prev => prev.phase !== 'report' ? prev : { ...prev, unmatched: prev.unmatched.map(item => ({ ...item, action: 'visitor' })), message: 'All unmatched attendees marked as visitors for this report' })
  }

  function dismissUnmatched() {
    setState(prev => prev.phase !== 'report' ? prev : { ...prev, unmatched: prev.unmatched.map(item => ({ ...item, action: 'ignore' })), message: 'Unmatched attendee review dismissed for this run' })
  }

  const handleAddAllValid = useCallback(async () => {
    if (state.phase !== 'report') return

    const validItems = state.unmatched.filter(item =>
      item.fullName.trim() &&
      item.subgroup.trim() &&
      !item.parseIssue
    )

    if (!validItems.length) {
      setState(prev => prev.phase !== 'report' ? prev : { ...prev, message: 'No valid unmatched attendees to add (missing subgroup or parse issue).' })
      return
    }

    const existing = await getExpectedRoster()
    const byMatchKey = new Map(existing.map(entry => [entry.matchKey, entry]))
    let added = 0

    for (const item of validItems) {
      const entry = unmatchedToRosterEntry(item)
      if (byMatchKey.has(entry.matchKey)) continue
      byMatchKey.set(entry.matchKey, entry)
      added++
    }

    if (!added) {
      setState(prev => prev.phase !== 'report' ? prev : { ...prev, message: 'No new attendees were added. All valid unmatched records already exist in roster.' })
      return
    }

    const mergedRoster = Array.from(byMatchKey.values())
    await setExpectedRoster(mergedRoster)
    setSavedRosterCount(mergedRoster.length)

    setState(prev => prev.phase !== 'report'
      ? prev
      : {
          ...prev,
          unmatched: prev.unmatched.map(item => {
            const valid = item.fullName.trim() && item.subgroup.trim() && !item.parseIssue
            return valid ? { ...item, action: 'add' } : item
          }),
          message: `Added ${added} unmatched attendee${added === 1 ? '' : 's'} to expected roster.`,
        })
  }, [state])

  if (state.phase === 'upload') {
    return <AttendanceUploadPanel onReady={handleFilesReady} onBack={onBack} hasSavedRoster={savedRosterCount > 0} savedRosterCount={savedRosterCount} />
  }
  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">!</div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>Failed to process files</h2>
          <p className="text-sm text-slate-500">{state.message}</p>
          <button onClick={() => setState({ phase: 'upload' })} className="px-6 py-2 rounded-lg font-semibold text-sm text-white" style={{ background: '#1B5E3C' }}>Try Again</button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <AttendanceReportPanel
        model={state.model}
        onReset={() => setState({ phase: 'upload' })}
        onBack={onBack}
        unmatchedItems={state.unmatched}
        message={state.message}
      />
      <div className="max-w-5xl mx-auto px-6 space-y-5 pb-8">
        <UnmatchedAttendeeReview
          items={state.unmatched}
          onChangeAction={handleChangeUnmatchedAction}
          onAddAllValid={() => { void handleAddAllValid() }}
          onMarkAllVisitors={markAllVisitors}
          onDismiss={dismissUnmatched}
        />
      </div>
    </div>
  )
}
