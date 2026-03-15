'use client'

import { useState, useCallback, useEffect } from 'react'
import { UploadPanel } from './UploadPanel'
import { ReportPanel } from './ReportPanel'
import type { GroupDirectory, NotesData, AllFTData } from '@/types'
import {
  aggregateNotes, parseFTRows, buildAllFTData,
} from '@/lib/parsers'
import { parseCSVFile } from '@/lib/csv-parser'
import {
  loadStoredGroups, saveStoredGroups, mergeCSVIntoStore,
  storedGroupsToDirectory, clearStoredGroups, type StoredGroup,
} from '@/lib/group-store'

type RawRow = Record<string, unknown>

export type AppState =
  | { phase: 'upload' }
  | {
      phase: 'reports'
      rawNotesRows: RawRow[]           // kept so we can re-aggregate when groups change
      groupDir: GroupDirectory
      notesData: NotesData
      ftAllData: AllFTData | null
    }
  | { phase: 'error'; message: string }

export function AppShell() {
  const [state,        setState]        = useState<AppState>({ phase: 'upload' })
  const [storedGroups, setStoredGroups] = useState<StoredGroup[]>([])

  // Load stored groups from localStorage on mount
  useEffect(() => {
    setStoredGroups(loadStoredGroups())
  }, [])

  // Persist whenever storedGroups changes
  useEffect(() => {
    saveStoredGroups(storedGroups)
  }, [storedGroups])

  // Called by GroupsView whenever the user edits/adds/deletes a group.
  // Re-aggregates notesData and rebuilds groupDir immediately — no re-upload needed.
  const handleGroupsChange = useCallback((groups: StoredGroup[]) => {
    setStoredGroups(groups)
    setState(prev => {
      if (prev.phase !== 'reports') return prev
      const groupDir  = storedGroupsToDirectory(groups)
      const notesData = aggregateNotes(prev.rawNotesRows, groupDir.byName)
      return { ...prev, groupDir, notesData }
    })
  }, [])

  const handleFilesReady = useCallback(async (
    notesFile: File,
    cellFTFile: File | null,
    serviceFTFile: File | null,
    groupFile: File | null,
  ) => {
    try {
      const notesRows = await parseCSVFile(notesFile) as RawRow[]

      // Merge any uploaded GROUP sheet into the store
      let currentGroups = storedGroups
      if (groupFile) {
        const groupRows = await parseCSVFile(groupFile)
        currentGroups = mergeCSVIntoStore(groupRows as RawRow[], storedGroups)
        setStoredGroups(currentGroups)
      }

      const groupDir = currentGroups.length > 0
        ? storedGroupsToDirectory(currentGroups)
        : { byName: new Map(), bySubgroup: new Map() }

      const notesData = aggregateNotes(notesRows, groupDir.byName)

      let ftAllData: AllFTData | null = null
      if (cellFTFile || serviceFTFile) {
        const cellRows    = cellFTFile    ? await parseCSVFile(cellFTFile)    : []
        const serviceRows = serviceFTFile ? await parseCSVFile(serviceFTFile) : []
        ftAllData = buildAllFTData(
          parseFTRows(cellRows    as RawRow[]),
          parseFTRows(serviceRows as RawRow[]),
        )
      }

      setState({ phase: 'reports', rawNotesRows: notesRows, groupDir, notesData, ftAllData })
    } catch (err: unknown) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred while parsing your files.',
      })
    }
  }, [storedGroups])


  const handleClearGroups = useCallback(() => {
    clearStoredGroups()
    setStoredGroups([])
    setState(prev => {
      if (prev.phase !== 'reports') return prev
      const groupDir = { byName: new Map(), bySubgroup: new Map() }
      const notesData = aggregateNotes(prev.rawNotesRows, groupDir.byName)
      return { ...prev, groupDir, notesData }
    })
  }, [])

  const handleReset = useCallback(() => setState({ phase: 'upload' }), [])

  if (state.phase === 'upload') {
    return (
      <UploadPanel
        onReady={handleFilesReady}
        hasStoredGroups={storedGroups.length > 0}
        storedGroupCount={storedGroups.length}
      />
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--brand-darkest)' }}>
            Failed to process files
          </h2>
          <p className="text-sm text-slate-500">{state.message}</p>
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-2 rounded-lg font-semibold text-sm text-white"
            style={{ background: 'var(--brand-mid)' }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ReportPanel
      groupDir={state.groupDir}
      notesData={state.notesData}
      ftAllData={state.ftAllData}
      storedGroups={storedGroups}
      onGroupsChange={handleGroupsChange}
      onClearGroups={handleClearGroups}
      onReset={handleReset}
    />
  )
}
