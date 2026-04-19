'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Check, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { parseCSVFile } from '@/lib/csv-parser'
import {
  FT_SUBGROUPS,
  type FTSubgroup,
} from '@/types'
import {
  getExpectedRoster,
  makeMatchKey,
  setExpectedRoster,
  type ExpectedRosterEntry,
} from '@/lib/attendance/roster-storage'

interface EditBuffer {
  fullName: string
  subgroup: string
  active: boolean
}

const EMPTY_ADD: EditBuffer = {
  fullName: '',
  subgroup: '',
  active: true,
}

function headerIndex(headers: string[], options: string[]) {
  const normalized = headers.map(h => h.toLowerCase().trim())
  for (const option of options) {
    const idx = normalized.indexOf(option)
    if (idx >= 0) return idx
  }
  return -1
}

export function RosterView() {
  const [rows, setRows] = useState<ExpectedRosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<EditBuffer>(EMPTY_ADD)

  const [addMode, setAddMode] = useState(false)
  const [addBuffer, setAddBuffer] = useState<EditBuffer>(EMPTY_ADD)
  const [addError, setAddError] = useState('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const timeoutMs = 8000
      const loaded = await Promise.race<ExpectedRosterEntry[]>([
        getExpectedRoster(),
        new Promise<ExpectedRosterEntry[]>((_, reject) => {
          setTimeout(() => reject(new Error('Roster load timed out. Please try again.')), timeoutMs)
        }),
      ])
      setRows(loaded)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load roster.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const persistRows = useCallback(async (nextRows: ExpectedRosterEntry[], successMessage: string) => {
    try {
      await setExpectedRoster(nextRows)
      setRows(nextRows)
      setMessage(successMessage)
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save roster changes.')
    }
  }, [])

  const startEdit = useCallback((row: ExpectedRosterEntry) => {
    setEditingId(row.id)
    setEditBuffer({ fullName: row.fullName, subgroup: row.subgroup, active: row.active })
    setAddMode(false)
    setAddError('')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditBuffer(EMPTY_ADD)
  }, [])

  const commitEdit = useCallback(async () => {
    if (!editingId) return

    const fullName = editBuffer.fullName.trim()
    if (!fullName) {
      setError('Full Name is required.')
      return
    }

    const duplicate = rows.some(row => row.id !== editingId && makeMatchKey(row.fullName) === makeMatchKey(fullName))
    if (duplicate) {
      setError('A roster member with that match key already exists.')
      return
    }

    const next = rows.map(row => row.id === editingId
      ? { ...row, fullName, subgroup: editBuffer.subgroup.trim(), active: editBuffer.active, updatedAt: new Date().toISOString() }
      : row)

    await persistRows(next, 'Roster entry updated')
    setEditingId(null)
    setEditBuffer(EMPTY_ADD)
  }, [editBuffer.active, editBuffer.fullName, editBuffer.subgroup, editingId, persistRows, rows])

  const toggleActive = useCallback(async (id: string) => {
    const next = rows.map(row => row.id === id ? { ...row, active: !row.active, updatedAt: new Date().toISOString() } : row)
    await persistRows(next, 'Roster active state updated')
  }, [persistRows, rows])

  const startAdd = useCallback(() => {
    setAddMode(true)
    setAddBuffer(EMPTY_ADD)
    setAddError('')
    setEditingId(null)
    setEditBuffer(EMPTY_ADD)
  }, [])

  const cancelAdd = useCallback(() => {
    setAddMode(false)
    setAddBuffer(EMPTY_ADD)
    setAddError('')
  }, [])

  const commitAdd = useCallback(async () => {
    const fullName = addBuffer.fullName.trim()
    if (!fullName) {
      setAddError('Full Name is required.')
      return
    }

    const key = makeMatchKey(fullName)
    if (rows.some(row => row.matchKey === key)) {
      setAddError('A roster member with that match key already exists.')
      return
    }

    const now = new Date().toISOString()
    const newRow: ExpectedRosterEntry = {
      id: `manual_${Math.random().toString(36).slice(2, 10)}`,
      fullName,
      matchKey: key,
      subgroup: addBuffer.subgroup.trim(),
      region: '',
      group: '',
      active: addBuffer.active,
      addedAt: now,
      updatedAt: now,
      source: 'manual',
    }

    await persistRows([...rows, newRow], 'Roster member added')
    setAddMode(false)
    setAddBuffer(EMPTY_ADD)
    setAddError('')
  }, [addBuffer.active, addBuffer.fullName, addBuffer.subgroup, persistRows, rows])

  const confirmDelete = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const commitDelete = useCallback(async () => {
    if (!deleteConfirmId) return
    const next = rows.filter(row => row.id !== deleteConfirmId)
    await persistRows(next, 'Roster member deleted')
    setDeleteConfirmId(null)
  }, [deleteConfirmId, persistRows, rows])

  const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    try {
      const parsed = await parseCSVFile(file) as Record<string, unknown>[]
      if (!parsed.length) {
        setError('CSV is empty.')
        return
      }

      const headers = Object.keys(parsed[0])
      const nameIdx = headerIndex(headers, ['fullname', 'full name'])
      const keyIdx = headerIndex(headers, ['matchkey', 'match key'])
      const subgroupIdx = headerIndex(headers, ['subgroup'])

      if (nameIdx < 0 || keyIdx < 0 || subgroupIdx < 0) {
        setError('CSV must include fullName, matchKey, subgroup columns.')
        return
      }

      const byKey = new Map<string, ExpectedRosterEntry>()
      for (const existing of rows) byKey.set(existing.matchKey, existing)

      for (const row of parsed) {
        const values = Object.values(row)
        const fullName = String(values[nameIdx] ?? '').trim()
        const providedKey = String(values[keyIdx] ?? '').trim().toLowerCase()
        const subgroup = String(values[subgroupIdx] ?? '').trim()
        if (!fullName) continue

        const matchKey = providedKey || makeMatchKey(fullName)
        const existing = byKey.get(matchKey)
        const now = new Date().toISOString()

        byKey.set(matchKey, {
          id: existing?.id ?? `import_${Math.random().toString(36).slice(2, 10)}`,
          fullName,
          matchKey,
          subgroup,
          region: existing?.region ?? '',
          group: existing?.group ?? '',
          active: existing?.active ?? true,
          addedAt: existing?.addedAt ?? now,
          updatedAt: now,
          source: 'import',
        })
      }

      const next = Array.from(byKey.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))
      await persistRows(next, 'Roster CSV imported and merged')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not import roster CSV.')
    }
  }, [persistRows, rows])

  const activeCount = useMemo(() => rows.filter(row => row.active).length, [rows])

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-5">
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight">Attendance Roster</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
          {rows.length} roster members ({activeCount} active)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={startAdd} disabled={addMode} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity" style={{ background: 'var(--brand-mid)', opacity: addMode ? 0.5 : 1 }}>
          <Plus size={14} />Add Roster Entry
        </button>
        <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white" style={{ background: 'var(--brand-dark)' }}>
          <Upload size={14} />Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        {message ? <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#EEF2FF', color: '#3730A3' }}>{message}</span> : null}
        {error ? <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</span> : null}
      </div>

      {addMode && (
        <div className="bg-white rounded-xl shadow-sm p-4 border-2" style={{ borderColor: 'var(--brand-mid)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--brand-dark)' }}>New Roster Entry</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--brand-dark)' }}>Full Name</label>
              <input
                autoFocus
                className="w-full text-sm px-3 py-1.5 rounded border"
                style={{ borderColor: 'var(--brand-light)' }}
                value={addBuffer.fullName}
                onChange={(e) => { setAddBuffer(prev => ({ ...prev, fullName: e.target.value })); setAddError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') void commitAdd(); if (e.key === 'Escape') cancelAdd() }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--brand-dark)' }}>Subgroup</label>
              <select className="w-full text-sm px-3 py-1.5 rounded border" style={{ borderColor: 'var(--brand-light)' }} value={addBuffer.subgroup} onChange={(e) => setAddBuffer(prev => ({ ...prev, subgroup: e.target.value }))}>
                <option value="">Unassigned</option>
                {FT_SUBGROUPS.map(subgroup => <option key={subgroup} value={subgroup}>{subgroup}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addBuffer.active} onChange={(e) => setAddBuffer(prev => ({ ...prev, active: e.target.checked }))} />
                Active
              </label>
            </div>
          </div>
          {addError ? <p className="text-xs text-red-500 mb-2">{addError}</p> : null}
          <div className="flex gap-2">
            <button onClick={() => { void commitAdd() }} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold text-white" style={{ background: '#22C55E' }}>
              <Check size={13} />Save
            </button>
            <button onClick={cancelAdd} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold" style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
              <X size={13} />Cancel
            </button>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-red-300">
          <p className="text-sm font-semibold mb-3" style={{ color: '#991B1B' }}>Delete this roster entry? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => { void commitDelete() }} className="px-4 py-1.5 rounded text-sm font-semibold text-white" style={{ background: '#EF4444' }}>Delete</button>
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-1.5 rounded text-sm font-semibold" style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-10 h-10 rounded-full border-4 mx-auto spin" style={{ borderColor: 'var(--brand-mid)', borderTopColor: 'transparent' }} />
          <p className="text-sm text-slate-500 mt-3">Loading roster…</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Full Name</th>
                <th style={{ textAlign: 'left' }}>Match Key</th>
                <th style={{ textAlign: 'left' }}>Subgroup</th>
                <th>Active</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  {editingId === row.id ? (
                    <>
                      <td>
                        <input className="w-full text-sm px-2 py-1 rounded border" style={{ borderColor: 'var(--brand-light)' }} value={editBuffer.fullName} onChange={(e) => setEditBuffer(prev => ({ ...prev, fullName: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') void commitEdit(); if (e.key === 'Escape') cancelEdit() }} />
                      </td>
                      <td className="text-xs text-slate-500">{makeMatchKey(editBuffer.fullName)}</td>
                      <td>
                        <select className="w-full text-sm px-2 py-1 rounded border" style={{ borderColor: 'var(--brand-light)' }} value={editBuffer.subgroup} onChange={(e) => setEditBuffer(prev => ({ ...prev, subgroup: e.target.value }))}>
                          <option value="">Unassigned</option>
                          {FT_SUBGROUPS.map((subgroup: FTSubgroup) => <option key={subgroup} value={subgroup}>{subgroup}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="checkbox" checked={editBuffer.active} onChange={(e) => setEditBuffer(prev => ({ ...prev, active: e.target.checked }))} />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { void commitEdit() }} title="Save" className="p-1 rounded" style={{ color: '#22C55E' }}><Check size={15} /></button>
                          <button onClick={cancelEdit} title="Cancel" className="p-1 rounded" style={{ color: '#94A3B8' }}><X size={15} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>{row.fullName}</td>
                      <td className="text-xs text-slate-500">{row.matchKey}</td>
                      <td>{row.subgroup || <span className="text-xs text-slate-400 italic">Unassigned</span>}</td>
                      <td>
                        <input type="checkbox" checked={row.active} onChange={() => { void toggleActive(row.id) }} />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(row)} title="Edit" className="p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: 'var(--brand-mid)' }}><Pencil size={14} /></button>
                          <button onClick={() => confirmDelete(row.id)} title="Delete" className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
