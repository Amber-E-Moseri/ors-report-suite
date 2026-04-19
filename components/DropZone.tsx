'use client'

import { useState, useRef, type DragEvent, type RefObject } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export interface SlotState {
  file: File | null
  error: string | null
  ok: boolean
}

export const EMPTY_SLOT: SlotState = { file: null, error: null, ok: false }

interface Props {
  label: string
  description: string
  required?: boolean
  derived?: boolean
  state: SlotState
  inputRef?: RefObject<HTMLInputElement | null>
  onFileSelect: (f: File) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  accentColor?: string
}

export function DropZone({
  label,
  description,
  required,
  derived,
  state,
  inputRef,
  onFileSelect,
  onDrop,
  accentColor = 'var(--brand-mid)',
}: Props) {
  const [dragging, setDragging] = useState(false)
  const localRef = useRef<HTMLInputElement | null>(null)
  const ref = inputRef ?? localRef

  function borderColor() {
    if (state.ok) return '#22C55E'
    if (state.error) return '#EF4444'
    if (dragging) return accentColor
    return '#CBD5E1'
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all relative"
      style={{
        borderColor: borderColor(),
        background: state.ok ? '#F0FDF4' : dragging ? '#EBF2FB' : '#fff',
      }}
      onClick={() => !derived && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!derived) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { setDragging(false); if (!derived) onDrop(e) }}
    >
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f) }}
      />

      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {derived ? (
            <span className="text-lg">⚙️</span>
          ) : state.ok ? (
            <CheckCircle size={20} color="#22C55E" />
          ) : state.error ? (
            <AlertCircle size={20} color="#EF4444" />
          ) : (
            <Upload size={20} color="#94A3B8" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm" style={{ color: 'var(--brand-darkest)' }}>
              {label}
            </span>
            {required && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)' }}
              >
                Required
              </span>
            )}
            {derived && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ background: '#D9F2E3', color: '#1B5E3C' }}
              >
                Auto-derived
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
          {!state.file && !state.error && !derived && (
            <p className="text-xs mt-1 text-slate-400">Click or drag to upload CSV</p>
          )}
          {derived && (
            <p className="text-xs mt-1 text-slate-400">Generated automatically from Elvanto export</p>
          )}
        </div>
      </div>
    </div>
  )
}
