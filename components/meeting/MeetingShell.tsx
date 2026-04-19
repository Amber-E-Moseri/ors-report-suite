'use client'

import { useState, useCallback } from 'react'
import { MeetingInputPanel } from './MeetingInputPanel'
import { MeetingReportPanel } from './MeetingReportPanel'
import type { MeetingSession, MeetingReport } from './types'

type ShellState =
  | { phase: 'input' }
  | { phase: 'report'; report: MeetingReport }

function normalizeNameKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function buildReport(session: MeetingSession): MeetingReport {
  const expectedNames = session.expected.map((name) => name.trim()).filter(Boolean)
  const attendedNames = session.attended.map((name) => name.trim()).filter(Boolean)

  const expectedSet = new Set(expectedNames.map((name) => normalizeNameKey(name)))
  const attendedSet = new Set(attendedNames.map((name) => normalizeNameKey(name)))

  const expectedMap = new Map(expectedNames.map((name) => [normalizeNameKey(name), name]))
  const attendedMap = new Map(attendedNames.map((name) => [normalizeNameKey(name), name]))

  const present: string[] = []
  const absent: string[] = []
  const unexpected: string[] = []

  for (const [key, name] of expectedMap) {
    if (attendedSet.has(key)) present.push(name)
    else absent.push(name)
  }

  for (const [key, name] of attendedMap) {
    if (!expectedSet.has(key)) unexpected.push(name)
  }

  present.sort((a, b) => a.localeCompare(b))
  absent.sort((a, b) => a.localeCompare(b))
  unexpected.sort((a, b) => a.localeCompare(b))

  const expectedCount = expectedNames.length
  const attendedCount = attendedNames.length
  const absentCount = absent.length
  const unexpectedCount = unexpected.length
  const reachPct = expectedCount > 0 ? present.length / expectedCount : 0

  return {
    label: session.label,
    expectedCount,
    attendedCount,
    absentCount,
    unexpectedCount,
    reachPct,
    present,
    absent,
    unexpected,
  }
}

export function MeetingShell({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ShellState>({ phase: 'input' })

  const handleGenerate = useCallback((session: MeetingSession) => {
    setState({ phase: 'report', report: buildReport(session) })
  }, [])

  const handleReset = useCallback(() => {
    setState({ phase: 'input' })
  }, [])

  if (state.phase === 'input') {
    return <MeetingInputPanel onGenerate={handleGenerate} onBack={onBack} />
  }

  return (
    <MeetingReportPanel
      report={state.report}
      onReset={handleReset}
      onBack={onBack}
    />
  )
}
