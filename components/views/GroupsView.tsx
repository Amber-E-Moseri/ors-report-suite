'use client'

import { useState, useCallback, useEffect, type ChangeEvent } from 'react'
import { Plus, Pencil, Trash2, Check, X, Upload, AlertTriangle, Download, DatabaseZap, Eraser } from 'lucide-react'
import type { StoredGroup } from '@/lib/group-store'
import {
  blankGroup,
  SUBGROUP_OPTIONS,
  mergeCSVIntoStore,
  exportStoredGroups,
  importStoredGroupsFromText,
  loadStoredGroups,
} from '@/lib/group-store'
import { parseCSVFile, validateGroupHeaders } from '@/lib/csv-parser'
import type { FollowUpSubgroup } from '@/types'

interface Props {
  groups: StoredGroup[]
  onChange: (groups: StoredGroup[]) => void
  onClearAll: () => void
}

export function GroupsView({ groups, onChange, onClearAll }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editBuf, setEditBuf] = useState<StoredGroup>(blankGroup())
  const [addMode, setAddMode] = useState(false)
  const [addBuf, setAddBuf] = useState<StoredGroup>(blankGroup())
  const [addError, setAddError] = useState('')
  const [importErr, setImportErr] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const refreshFromSupabase = useCallback(async () => {
    setSyncing(true)
    try {
      const latest = await loadStoredGroups()
      onChange(latest)
      setSyncMessage(
        latest.length
          ? `Loaded ${latest.length} groups from Supabase`
          : 'No groups found in Supabase for this account'
      )
    } catch {
      setSyncMessage('Could not sync groups from Supabase right now')
    } finally {
      setSyncing(false)
    }
  }, [onChange])

  useEffect(() => {
    if (groups.length === 0) {
      void refreshFromSupabase()
    }
  }, [groups.length, refreshFromSupabase])

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditBuf({ ...groups[idx] })
    setAddMode(false)
  }

  function commitEdit() {
    if (editingIdx === null || !editBuf.name.trim()) return
    const nextName = editBuf.name.trim()
    const duplicate = groups.some((g, i) => i !== editingIdx && g.name.toLowerCase() === nextName.toLowerCase())
    if (duplicate) return
    const updated = groups.map((g, i) => i === editingIdx ? { ...editBuf, name: nextName } : g)
    onChange(updated)
    setEditingIdx(null)
  }

  function cancelEdit() { setEditingIdx(null) }

  function startAdd() {
    setAddMode(true)
    setAddBuf(blankGroup())
    setAddError('')
    setEditingIdx(null)
  }

  function commitAdd() {
    const name = addBuf.name.trim()
    if (!name) { setAddError('Group name is required.'); return }
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      setAddError('A group with that name already exists.')
      return
    }
    onChange([...groups, { ...addBuf, name }])
    setAddMode(false)
    setAddBuf(blankGroup())
    setAddError('')
  }

  function cancelAdd() { setAddMode(false); setAddError('') }

  function confirmDelete(idx: number) { setDeleteConfirm(idx) }

  function commitDelete() {
    if (deleteConfirm === null) return
    onChange(groups.filter((_, i) => i !== deleteConfirm))
    setDeleteConfirm(null)
  }

  const handleImport = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const rows = await parseCSVFile(file)
      const v = validateGroupHeaders(rows)
      if (!v.ok) { setImportErr(`Missing columns: ${v.missing.join(', ')}`); return }
      const merged = mergeCSVIntoStore(rows as Record<string, unknown>[], groups)
      onChange(merged)
      setImportErr('')
    } catch (err: unknown) {
      setImportErr(err instanceof Error ? err.message : 'Failed to parse file.')
    }
  }, [groups, onChange])

  const handleBackupImport = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const imported = importStoredGroupsFromText(text)
      onChange(imported)
      setImportErr('')
    } catch (err: unknown) {
      setImportErr(err instanceof Error ? err.message : 'Invalid backup file.')
    }
  }, [onChange])

  const handleExport = useCallback(() => {
    const blob = new Blob([exportStoredGroups(groups)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'blw-groups-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [groups])

  const subgroupCounts = SUBGROUP_OPTIONS.filter(o => o.value).map(o => ({
    label: o.label,
    count: groups.filter(g => g.subgroup === o.value).length,
  }))
  const unassigned = groups.filter(g => !g.subgroup).length

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-5">
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight">Group Directory</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
          {groups.length} group{groups.length !== 1 ? 's' : ''} stored · saved in this browser so you do not need to re-import each session
        </p>
      </div>

      <div className="rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-2"
        style={{ background: '#F8FAFC', borderColor: '#CBD5E1', color: '#334155' }}>
        <DatabaseZap size={16} />
        <span>
          Your directory syncs with Supabase and also keeps a local cache. Use <strong>Sync from Supabase</strong> to refresh, or <strong>Export Backup</strong> for a safety copy.
        </span>
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subgroupCounts.map(s => (
            <span key={s.label}
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: 'var(--brand-pale)', color: 'var(--brand-darkest)', border: '1px solid var(--brand-light)' }}>
              {s.label.replace('BLW Canada ', '')} · {s.count}
            </span>
          ))}
          {unassigned > 0 && (
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: '#FFF4CC', color: '#7A5A00', border: '1px solid #F6D860' }}>
              Unassigned · {unassigned}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={startAdd}
          disabled={addMode}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ background: 'var(--brand-mid)', opacity: addMode ? 0.5 : 1 }}
        >
          <Plus size={14} /> Add Group
        </button>

        <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer text-white"
          style={{ background: 'var(--brand-dark)' }}>
          <Upload size={14} /> Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>

        <button
          onClick={() => { void refreshFromSupabase() }}
          disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: '#DBEAFE', color: '#1E3A8A', opacity: syncing ? 0.65 : 1 }}
        >
          <DatabaseZap size={14} /> {syncing ? 'Syncing...' : 'Sync from Supabase'}
        </button>

        <button
          onClick={handleExport}
          disabled={groups.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: '#E2E8F0', color: '#0F172A', opacity: groups.length === 0 ? 0.5 : 1 }}
        >
          <Download size={14} /> Export Backup
        </button>

        <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          style={{ background: '#F1F5F9', color: '#0F172A' }}>
          <Upload size={14} /> Import Backup
          <input type="file" accept=".json" className="hidden" onChange={handleBackupImport} />
        </label>

        <button
          onClick={() => setClearConfirm(true)}
          disabled={groups.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: '#FEF2F2', color: '#B91C1C', opacity: groups.length === 0 ? 0.5 : 1 }}
        >
          <Eraser size={14} /> Clear Saved Groups
        </button>

        {importErr && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ background: '#FEE2E2', color: '#991B1B' }}>
            <AlertTriangle size={12} /> {importErr}
          </span>
        )}
        {syncMessage && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#EEF2FF', color: '#3730A3' }}>
            {syncMessage}
          </span>
        )}
      </div>

      {addMode && (
        <div className="bg-white rounded-xl shadow-sm p-4 border-2"
          style={{ borderColor: 'var(--brand-mid)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: 'var(--brand-dark)' }}>New Group</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--brand-dark)' }}>
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                className="w-full text-sm px-3 py-1.5 rounded border"
                style={{ borderColor: 'var(--brand-light)' }}
                value={addBuf.name}
                onChange={e => { setAddBuf(b => ({ ...b, name: e.target.value })); setAddError('') }}
                onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') cancelAdd() }}
                placeholder="e.g. Graceland Cell"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--brand-dark)' }}>
                Subgroup
              </label>
              <select
                className="w-full text-sm px-3 py-1.5 rounded border"
                style={{ borderColor: 'var(--brand-light)' }}
                value={addBuf.subgroup}
                onChange={e => setAddBuf(b => ({ ...b, subgroup: e.target.value as FollowUpSubgroup | '' }))}
              >
                {SUBGROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--brand-dark)' }}>
                Total Members
              </label>
              <input
                type="number" min={0}
                className="w-full text-sm px-3 py-1.5 rounded border"
                style={{ borderColor: 'var(--brand-light)' }}
                value={addBuf.totalMembers}
                onChange={e => setAddBuf(b => ({ ...b, totalMembers: Math.max(0, Number(e.target.value)) }))}
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-500 mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={commitAdd}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold text-white"
              style={{ background: '#22C55E' }}>
              <Check size={13} /> Save
            </button>
            <button onClick={cancelAdd}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold"
              style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-red-300">
          <p className="text-sm font-semibold mb-3" style={{ color: '#991B1B' }}>
            Delete <strong>{groups[deleteConfirm]?.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={commitDelete}
              className="px-4 py-1.5 rounded text-sm font-semibold text-white"
              style={{ background: '#EF4444' }}>
              Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)}
              className="px-4 py-1.5 rounded text-sm font-semibold"
              style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {clearConfirm && (
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-red-300">
          <p className="text-sm font-semibold mb-3" style={{ color: '#991B1B' }}>
            Clear the entire saved group directory from this browser?
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Export a backup first if you want to restore it later or move it to another computer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClearAll()
                setClearConfirm(false)
              }}
              className="px-4 py-1.5 rounded text-sm font-semibold text-white"
              style={{ background: '#EF4444' }}
            >
              Clear Saved Groups
            </button>
            <button onClick={() => setClearConfirm(false)}
              className="px-4 py-1.5 rounded text-sm font-semibold"
              style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && !addMode ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-slate-400 italic text-sm">
          No groups saved yet. Add one manually, import a GROUP sheet CSV, or import a JSON backup.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Group Name</th>
                <th style={{ textAlign: 'left' }}>Subgroup</th>
                <th>Members</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => (
                <tr key={idx}>
                  {editingIdx === idx ? (
                    <>
                      <td>
                        <input
                          autoFocus
                          className="w-full text-sm px-2 py-1 rounded border"
                          style={{ borderColor: 'var(--brand-light)' }}
                          value={editBuf.name}
                          onChange={e => setEditBuf(b => ({ ...b, name: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
                        />
                      </td>
                      <td>
                        <select
                          className="w-full text-sm px-2 py-1 rounded border"
                          style={{ borderColor: 'var(--brand-light)' }}
                          value={editBuf.subgroup}
                          onChange={e => setEditBuf(b => ({ ...b, subgroup: e.target.value as FollowUpSubgroup | '' }))}
                        >
                          {SUBGROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number" min={0}
                          className="w-20 text-sm px-2 py-1 rounded border text-center"
                          style={{ borderColor: 'var(--brand-light)' }}
                          value={editBuf.totalMembers}
                          onChange={e => setEditBuf(b => ({ ...b, totalMembers: Math.max(0, Number(e.target.value)) }))}
                        />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={commitEdit} title="Save"
                            className="p-1 rounded" style={{ color: '#22C55E' }}>
                            <Check size={15} />
                          </button>
                          <button onClick={cancelEdit} title="Cancel"
                            className="p-1 rounded" style={{ color: '#94A3B8' }}>
                            <X size={15} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>{g.name}</td>
                      <td>
                        {g.subgroup ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
                            {g.subgroup.replace('BLW Canada ', '')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="font-semibold" style={{ color: 'var(--brand-mid)' }}>{g.totalMembers}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(idx)} title="Edit"
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            style={{ color: 'var(--brand-mid)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => confirmDelete(idx)} title="Delete"
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            style={{ color: '#EF4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td>{groups.filter(g => g.subgroup).length} assigned</td>
                <td>{groups.reduce((s, g) => s + g.totalMembers, 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
