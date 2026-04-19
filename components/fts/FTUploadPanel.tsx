'use client'

import { useState, useRef, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Loader2, UserPlus } from 'lucide-react'
import { DropZone, EMPTY_SLOT, type SlotState } from '../DropZone'
import { validateFTHeaders, parseCSVFile } from '@/lib/csv-parser'

interface Props {
  onReady: (cellFTFile: File | null, serviceFTFile: File | null) => Promise<void>
  onBack: () => void
}

export function FTUploadPanel({ onReady, onBack }: Props) {
  const [cellFT, setCellFT] = useState<SlotState>(EMPTY_SLOT)
  const [svcFT,  setSvcFT]  = useState<SlotState>(EMPTY_SLOT)
  const [loading, setLoading] = useState(false)

  const cellRef  = useRef<HTMLInputElement | null>(null)
  const svcRef   = useRef<HTMLInputElement | null>(null)

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
        if (!v.ok) { setSlot({ file, error: `Missing columns: ${v.missing.join(', ')}`, ok: false }); return }
      }
      setSlot({ file, error: null, ok: true })
    } catch (e: unknown) {
      setSlot({ file, error: e instanceof Error ? e.message : 'Failed to read file', ok: false })
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>, setSlot: (s: SlotState) => void, validator?: (rows: Record<string, unknown>[]) => { ok: boolean; missing: string[] }) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file, setSlot, validator)
  }

  const canGenerate = cellFT.ok || svcFT.ok

  async function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    try {
      await onReady(
        cellFT.ok ? cellFT.file : null,
        svcFT.ok  ? svcFT.file  : null,
      )
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#5346B8' }}>
            <UserPlus size={18} color="#fff" />
          </div>
          <div>
            <h1 className="font-bold text-xl" style={{ color: 'var(--brand-darkest)' }}>First Timers Report</h1>
            <p className="text-xs text-slate-500">Cell and service first-timer summaries with subgroup breakdowns</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DropZone
          label="Cell FTs Import"
          description="Cell first-timers CSV"
          state={cellFT}
          inputRef={cellRef}
          onFileSelect={(f) => void handleFile(f, setCellFT, validateFTHeaders)}
          onDrop={(e) => onDrop(e, setCellFT, validateFTHeaders)}
          accentColor="#5346B8"
        />
        <DropZone
          label="Service FTs Import"
          description="Service first-timers CSV"
          state={svcFT}
          inputRef={svcRef}
          onFileSelect={(f) => void handleFile(f, setSvcFT, validateFTHeaders)}
          onDrop={(e) => onDrop(e, setSvcFT, validateFTHeaders)}
          accentColor="#5346B8"
        />
      </div>

      <p className="text-xs text-slate-400 mb-6 text-center max-w-md">
        Upload <strong>at least one</strong> FT file (Cell or Service) to generate the report.
        Both files together produce a combined summary.
      </p>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || loading}
        className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all"
        style={{ background: canGenerate ? '#5346B8' : '#CBD5E1', color: '#fff', cursor: canGenerate ? 'pointer' : 'not-allowed' }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <ChevronRight size={16} />}
        {loading ? 'Processing…' : 'Generate FT Report'}
      </button>
    </div>
  )
}
