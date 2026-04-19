'use client'

import { useState, useRef, type DragEvent, type RefObject } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import {
  validateFTHeaders,
  validateNotesHeaders,
  validateGroupHeaders,
} from '@/lib/csv-parser'

interface Props {
  onReady: (
    notesFile: File,
    cellFTFile: File | null,
    serviceFTFile: File | null,
    groupFile: File | null,
  ) => Promise<void>
  hasStoredGroups: boolean
  storedGroupCount: number
}

interface SlotState {
  file: File | null
  error: string | null
  ok: boolean
}

const EMPTY: SlotState = { file: null, error: null, ok: false }

export function UploadPanel({
  onReady,
  hasStoredGroups,
  storedGroupCount,
}: Props) {
  const [notes, setNotes] = useState<SlotState>(EMPTY)
  const [cellFT, setCellFT] = useState<SlotState>(EMPTY)
  const [svcFT, setSvcFT] = useState<SlotState>(EMPTY)
  const [groupF, setGroupF] = useState<SlotState>(EMPTY)
  const [loading, setLoading] = useState(false)

  const notesRef = useRef<HTMLInputElement | null>(null)
  const cellRef = useRef<HTMLInputElement | null>(null)
  const svcRef = useRef<HTMLInputElement | null>(null)
  const groupRef = useRef<HTMLInputElement | null>(null)

  async function readCSV(file: File): Promise<Record<string, unknown>[]> {
    const { parseCSVFile } = await import('@/lib/csv-parser')
    return parseCSVFile(file)
  }

  async function handleFile(
    file: File,
    setSlot: (s: SlotState) => void,
    validator?: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] },
  ) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
      setSlot({ file: null, error: 'Only CSV files are supported', ok: false })
      return
    }

    try {
      const rows = await readCSV(file)

      if (validator) {
        const v = validator(rows)
        if (!v.ok) {
          setSlot({
            file,
            error: `Missing columns: ${v.missing.join(', ')}`,
            ok: false,
          })
          return
        }
      }

      setSlot({ file, error: null, ok: true })
    } catch (e: unknown) {
      setSlot({
        file,
        error: e instanceof Error ? e.message : 'Failed to read file',
        ok: false,
      })
    }
  }

  function onDrop(
    e: DragEvent<HTMLDivElement>,
    setSlot: (s: SlotState) => void,
    validator?: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] },
  ) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleFile(file, setSlot, validator)
    }
  }

  async function handleGenerate() {
    if (!notes.ok || !notes.file) return

    setLoading(true)
    try {
      await onReady(notes.file, cellFT.file, svcFT.file, groupF.file)
    } finally {
      setLoading(false)
    }
  }

  const canGenerate = notes.ok

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <div
          className="inline-block px-6 py-3 rounded-xl mb-4"
          style={{ background: 'var(--brand-darkest)' }}
        >
          <span className="text-white font-bold text-2xl tracking-tight">
            ORS Report Suite
          </span>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Upload your CSV exports to generate ORS follow-up and first-timer reports
        </p>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <DropZone
          label="ELVANTO Notes"
          description="Raw or cleaned Elvanto notes export"
          required
          state={notes}
          inputRef={notesRef}
          onFileSelect={(f) => void handleFile(f, setNotes, validateNotesHeaders)}
          onDrop={(e) => onDrop(e, setNotes, validateNotesHeaders)}
        />

        <DropZone
          label="Cell FTs Import"
          description="Cell first-timers CSV"
          state={cellFT}
          inputRef={cellRef}
          onFileSelect={(f) => void handleFile(f, setCellFT, validateFTHeaders)}
          onDrop={(e) => onDrop(e, setCellFT, validateFTHeaders)}
        />

        <DropZone
          label="Service FTs Import"
          description="Service first-timers CSV"
          state={svcFT}
          inputRef={svcRef}
          onFileSelect={(f) => void handleFile(f, setSvcFT, validateFTHeaders)}
          onDrop={(e) => onDrop(e, setSvcFT, validateFTHeaders)}
        />

        <DropZone
          label="GROUP Sheet"
          description={
            hasStoredGroups
              ? `${storedGroupCount} groups stored — upload to update`
              : 'Group directory CSV (optional)'
          }
          state={groupF}
          inputRef={groupRef}
          onFileSelect={(f) => void handleFile(f, setGroupF, validateGroupHeaders)}
          onDrop={(e) => onDrop(e, setGroupF, validateGroupHeaders)}
        />
      </div>

      {hasStoredGroups && (
        <div
          className="w-full max-w-3xl mb-4 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2"
          style={{ background: '#D9F2E3', color: '#1B5E3C' }}
        >
          ✓ {storedGroupCount} groups loaded from saved directory — GROUP sheet upload is
          optional this session.
        </div>
      )}

      <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
        <strong>Required:</strong> ELVANTO Notes. <strong>Optional but recommended:</strong>{' '}
        Cell FTs, Service FTs, and GROUP sheet for complete reports.
      </p>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
        style={{
          background: canGenerate ? 'var(--brand-mid)' : '#CBD5E1',
          color: '#fff',
          cursor: canGenerate ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
        {loading ? 'Processing…' : 'Generate Reports'}
      </button>
    </div>
  )
}

interface DropZoneProps {
  label: string
  description: string
  required?: boolean
  state: SlotState
  inputRef: RefObject<HTMLInputElement | null>
  onFileSelect: (f: File) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
}

function DropZone({
  label,
  description,
  required,
  state,
  inputRef,
  onFileSelect,
  onDrop,
}: DropZoneProps) {
  const [dragging, setDragging] = useState(false)

  function borderColor() {
    if (state.ok) return '#22C55E'
    if (state.error) return '#EF4444'
    if (dragging) return 'var(--brand-mid)'
    return '#CBD5E1'
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all relative"
      style={{
        borderColor: borderColor(),
        background: state.ok ? '#F0FDF4' : dragging ? 'var(--brand-pale)' : '#fff',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        setDragging(false)
        onDrop(e)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFileSelect(f)
        }}
      />

      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {state.ok ? (
            <CheckCircle size={20} color="#22C55E" />
          ) : state.error ? (
            <AlertCircle size={20} color="#EF4444" />
          ) : (
            <Upload size={20} color="#94A3B8" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="font-semibold text-sm"
              style={{ color: 'var(--brand-darkest)' }}
            >
              {label}
            </span>

            {required && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: 'var(--brand-light)',
                  color: 'var(--brand-dark)',
                }}
              >
                Required
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-0.5">{description}</p>

          {state.file && !state.error && (
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--brand-mid)' }}>
              <FileText size={11} className="inline mr-1" />
              {state.file.name}
            </p>
          )}

          {state.error && <p className="text-xs mt-1 text-red-500">{state.error}</p>}

          {!state.file && !state.error && (
            <p className="text-xs mt-1 text-slate-400">Click or drag to upload CSV</p>
          )}
        </div>
      </div>
    </div>
  )
}