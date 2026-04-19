'use client'

import { useState, useRef, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react'
import { DropZone, EMPTY_SLOT, type SlotState } from '../DropZone'
import { parseCSVFile } from '@/lib/csv-parser'

interface Props {
  onReady: (elvantoFile: File) => Promise<void>
  onBack: () => void
  hasSavedRoster: boolean
  savedRosterCount: number
}

function validateElvantoHeaders(rows: Record<string, unknown>[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: ['(empty file)'] }
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase())
  const hasName = headers.some(h => h.includes('name'))
  if (!hasName) return { ok: false, missing: ['name column'] }
  return { ok: true, missing: [] }
}

export function AttendanceUploadPanel({ onReady, onBack, hasSavedRoster, savedRosterCount }: Props) {
  const [elvanto, setElvanto] = useState<SlotState>(EMPTY_SLOT)
  const [loading, setLoading] = useState(false)

  const elvantoRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(file: File, setSlot: (s: SlotState) => void, validator: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] }) {
    if (!file.name.toLowerCase().endsWith('.csv')) { setSlot({ file: null, error: 'Only CSV files are supported', ok: false }); return }
    try {
      const rows = await parseCSVFile(file)
      const v = validator(rows)
      if (!v.ok) { setSlot({ file, error: `Missing columns: ${v.missing.join(', ')}`, ok: false }); return }
      setSlot({ file, error: null, ok: true })
    } catch (e: unknown) { setSlot({ file, error: e instanceof Error ? e.message : 'Failed to read file', ok: false }) }
  }

  function onDrop(e: DragEvent<HTMLDivElement>, setSlot: (s: SlotState) => void, validator: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] }) {
    e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) void handleFile(file, setSlot, validator)
  }

  const canGenerate = elvanto.ok && hasSavedRoster

  async function handleGenerate() {
    if (!elvanto.file || !hasSavedRoster) return
    setLoading(true)
    try { await onReady(elvanto.file) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F5F8FC' }}>
      <div className="w-full max-w-3xl mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium mb-4" style={{ color: 'var(--brand-mid)' }}>
          <ChevronLeft size={15} /> Back to report selection
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#1B5E3C' }}>
            <Users size={18} color="#fff" />
          </div>
          <div>
            <h1 className="font-bold text-xl" style={{ color: 'var(--brand-darkest)' }}>Meeting Attendance Report</h1>
            <p className="text-xs text-slate-500">Uses roster expected from Supabase and matches against Elvanto attendance</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl mb-4">
        <DropZone
          label="Elvanto Attendance Export"
          description="Raw Elvanto attendance CSV"
          required
          state={elvanto}
          inputRef={elvantoRef}
          onFileSelect={(f) => void handleFile(f, setElvanto, validateElvantoHeaders)}
          onDrop={(e) => onDrop(e, setElvanto, validateElvantoHeaders)}
          accentColor="#1B5E3C"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 text-xs">
        {hasSavedRoster
          ? <span className="rounded-full px-3 py-1" style={{ background: '#D9F2E3', color: '#1B5E3C' }}>Supabase roster loaded: {savedRosterCount} entries</span>
          : <span className="rounded-full px-3 py-1" style={{ background: '#FEF2F2', color: '#991B1B' }}>No active attendance roster found. Add rows in Settings {'>'} Attendance Roster.</span>}
      </div>

      <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
        <strong>Required:</strong> Elvanto attendance CSV. Roster expected is loaded from Supabase only.
      </p>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
        style={{ background: canGenerate ? '#1B5E3C' : '#CBD5E1', color: '#fff', cursor: canGenerate ? 'pointer' : 'not-allowed' }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
        {loading ? 'Processing...' : 'Generate Attendance Report'}
      </button>
    </div>
  )
}
