'use client'

import { useState, useRef, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react'
import { DropZone, EMPTY_SLOT, type SlotState } from '../DropZone'
import { validateNotesHeaders, parseCSVFile } from '@/lib/csv-parser'

interface Props {
  onReady: (notesFile: File) => Promise<void>
  onBack: () => void
}

export function FollowUpUploadPanel({ onReady, onBack }: Props) {
  const [notes, setNotes] = useState<SlotState>(EMPTY_SLOT)
  const [loading, setLoading] = useState(false)

  const notesRef = useRef<HTMLInputElement | null>(null)

  async function handleFile(
    file: File,
    setSlot: (s: SlotState) => void,
    validator?: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] },
  ) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSlot({ file: null, error: 'Only CSV files are supported', ok: false })
      return
    }
    try {
      const rows = await parseCSVFile(file)
      if (validator) {
        const v = validator(rows)
        if (!v.ok) {
          setSlot({ file, error: `Missing columns: ${v.missing.join(', ')}`, ok: false })
          return
        }
      }
      setSlot({ file, error: null, ok: true })
    } catch (e: unknown) {
      setSlot({ file, error: e instanceof Error ? e.message : 'Failed to read file', ok: false })
    }
  }

  function onDrop(
    e: DragEvent<HTMLDivElement>,
    setSlot: (s: SlotState) => void,
    validator?: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] },
  ) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file, setSlot, validator)
  }

  async function handleGenerate() {
    if (!notes.ok || !notes.file) return
    setLoading(true)
    try {
      await onReady(notes.file)
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#B06000' }}>
            <FileText size={18} color="#fff" />
          </div>
          <div>
            <h1 className="font-bold text-xl" style={{ color: 'var(--brand-darkest)' }}>Follow-Up Report</h1>
            <p className="text-xs text-slate-500">Notes by subgroup, group, and leader with activity summary</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 gap-4 mb-6">
        <DropZone
          label="ELVANTO Notes"
          description="Raw Elvanto notes export CSV"
          required
          state={notes}
          inputRef={notesRef}
          onFileSelect={(f) => void handleFile(f, setNotes, validateNotesHeaders)}
          onDrop={(e) => onDrop(e, setNotes, validateNotesHeaders)}
          accentColor="#B06000"
        />
      </div>

      <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
        <strong>Required:</strong> ELVANTO Notes export.
      </p>

      <button
        onClick={handleGenerate}
        disabled={!notes.ok || loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
        style={{ background: notes.ok ? '#B06000' : '#CBD5E1', color: '#fff', cursor: notes.ok ? 'pointer' : 'not-allowed' }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
        {loading ? 'Processing...' : 'Generate Follow-Up Report'}
      </button>
    </div>
  )
}
