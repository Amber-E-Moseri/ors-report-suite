'use client'

import { useMemo, useRef, useState, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react'
import { DropZone, EMPTY_SLOT, type SlotState } from '../DropZone'
import { parseCSVFile } from '@/lib/csv-parser'
import type { MeetingSession } from './types'

interface Props {
  onGenerate: (session: MeetingSession) => void
  onBack: () => void
}

type RawRow = Record<string, unknown>

function findNameColumn(row: RawRow | undefined): string | null {
  if (!row) return null
  const keys = Object.keys(row)
  const normalized = keys.map((key) => ({
    raw: key,
    clean: key.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(),
  }))

  const disallowed = ['group name', 'group', 'subgroup', 'meeting name']

  const exactCandidates = ['full name', 'fullname', 'name', 'person', 'contact name', 'contact']
  for (const candidate of exactCandidates) {
    const hit = normalized.find((entry) => entry.clean === candidate)
    if (hit && !disallowed.includes(hit.clean)) return hit.raw
  }

  const fuzzyPriority = ['full name', 'contact name', 'person name', 'member name']
  for (const candidate of fuzzyPriority) {
    const hit = normalized.find((entry) => entry.clean.includes(candidate))
    if (hit && !disallowed.includes(hit.clean)) return hit.raw
  }

  const generic = normalized.find((entry) => entry.clean.includes('name') && !disallowed.includes(entry.clean))
  if (generic) return generic.raw

  return null
}

function normalizeNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names) {
    const key = normalizeNameKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function parseNamesFromRows(rows: RawRow[]): string[] {
  const nameColumn = findNameColumn(rows[0])
  if (!nameColumn) return []
  const names = rows
    .map((row) => String(row[nameColumn] ?? '').trim())
    .filter(Boolean)
  return dedupeNames(names)
}

function validateNameHeaders(rows: RawRow[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: ['(empty file)'] }
  const nameColumn = findNameColumn(rows[0])
  if (!nameColumn) return { ok: false, missing: ['name column'] }
  return { ok: true, missing: [] }
}

export function MeetingInputPanel({ onGenerate, onBack }: Props) {
  const [label, setLabel] = useState('')
  const [expectedSlot, setExpectedSlot] = useState<SlotState>(EMPTY_SLOT)
  const [attendedSlot, setAttendedSlot] = useState<SlotState>(EMPTY_SLOT)
  const [expectedNames, setExpectedNames] = useState<string[]>([])
  const [attendedNames, setAttendedNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const expectedRef = useRef<HTMLInputElement | null>(null)
  const attendedRef = useRef<HTMLInputElement | null>(null)

  const canGenerate = expectedSlot.ok && expectedNames.length > 0

  const summaryText = useMemo(() => {
    return `${expectedNames.length} expected | ${attendedNames.length} attended`
  }, [expectedNames.length, attendedNames.length])

  async function handleFile(
    file: File,
    setSlot: (state: SlotState) => void,
    setNames: (names: string[]) => void,
  ) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSlot({ file: null, error: 'Only CSV files are supported', ok: false })
      setNames([])
      return
    }

    try {
      const rows = await parseCSVFile(file) as RawRow[]
      const validation = validateNameHeaders(rows)
      if (!validation.ok) {
        setSlot({ file, error: `Missing columns: ${validation.missing.join(', ')}`, ok: false })
        setNames([])
        return
      }

      const names = parseNamesFromRows(rows)
      setNames(names)
      setSlot({ file, error: null, ok: true })
    } catch (error: unknown) {
      setSlot({ file, error: error instanceof Error ? error.message : 'Failed to read file', ok: false })
      setNames([])
    }
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    setSlot: (state: SlotState) => void,
    setNames: (names: string[]) => void,
  ) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file, setSlot, setNames)
  }

  function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    try {
      onGenerate({
        label: label.trim() || new Date().toLocaleDateString(),
        expected: expectedNames,
        attended: attendedNames,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F5F8FC' }}>
      <div className="w-full max-w-3xl mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium mb-4" style={{ color: 'var(--brand-mid)' }}>
          <ChevronLeft size={15} /> Back to report selection
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#2A5298' }}>
            <Users size={18} color="#fff" />
          </div>
          <div>
            <h1 className="font-bold text-xl" style={{ color: 'var(--brand-darkest)' }}>Meeting Report</h1>
            <p className="text-xs text-slate-500">Import expected and attended CSVs to generate the meeting report</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mb-4">
        <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--brand-dark)' }}>
          Meeting Label
        </label>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Sunday April 20"
          className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          style={{ color: '#0F172A', background: '#fff' }}
        />
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <DropZone
          label="Expected List CSV"
          description="CSV with expected attendee names"
          required
          state={expectedSlot}
          inputRef={expectedRef}
          onFileSelect={(file) => void handleFile(file, setExpectedSlot, setExpectedNames)}
          onDrop={(event) => handleDrop(event, setExpectedSlot, setExpectedNames)}
          accentColor="#2A5298"
        />
        <DropZone
          label="Attended List CSV"
          description="CSV with names who attended"
          state={attendedSlot}
          inputRef={attendedRef}
          onFileSelect={(file) => void handleFile(file, setAttendedSlot, setAttendedNames)}
          onDrop={(event) => handleDrop(event, setAttendedSlot, setAttendedNames)}
          accentColor="#2A5298"
        />
      </div>

      <p className="text-xs text-slate-500 mb-5">{summaryText}</p>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
        Required: Expected list CSV with a name column. Attended CSV is optional.
      </p>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
        style={{
          background: canGenerate ? '#2A5298' : '#CBD5E1',
          color: '#fff',
          cursor: canGenerate ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
        {loading ? 'Processing...' : 'Generate Meeting Report'}
      </button>
    </div>
  )
}
