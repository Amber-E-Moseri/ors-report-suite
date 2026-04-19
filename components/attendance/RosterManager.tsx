'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Download, RotateCcw, Plus, Trash2, Pencil, Power } from 'lucide-react'
import { parseCSVFile } from '@/lib/csv-parser'
import { downloadCsv, rosterBySubgroup, rosterToCsv } from '@/lib/attendance/roster-export'
import { importRosterRows } from '@/lib/attendance/roster-import'
import {
  ROSTER_SUBGROUP_EXPORTS,
  deleteRosterEntry,
  deriveRegionFromSubgroup,
  getExpectedRoster,
  resetExpectedRoster,
  setRosterEntryActive,
  subgroupToExportLabel,
  upsertRosterEntry,
  type ExpectedRosterEntry,
  type RosterImportMode,
} from '@/lib/attendance/roster-storage'

interface Props {
  onClose?: () => void
}

const EMPTY_FORM = { fullName: '', subgroup: '', region: '', group: '', active: true }

export function RosterManager({ onClose }: Props) {
  const [entries, setEntries] = useState<ExpectedRosterEntry[]>([])
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [subgroup, setSubgroup] = useState('all')
  const [group, setGroup] = useState('all')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<RosterImportMode>('merge')
  const [exportSubgroup, setExportSubgroup] = useState<string>(ROSTER_SUBGROUP_EXPORTS[0])
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function refresh(msg?: string) {
    setEntries(await getExpectedRoster())
    if (msg) setMessage(msg)
  }

  useEffect(() => {
    void (async () => {
      const loaded = await getExpectedRoster()
      setEntries(loaded)
      setMessage(loaded.length ? 'Saved roster loaded' : 'No saved roster found yet')
    })()
  }, [])

  const filtered = useMemo(() => entries.filter(entry => {
    const text = `${entry.fullName} ${entry.region} ${entry.subgroup} ${entry.group}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (region !== 'all' && entry.region !== region) return false
    if (subgroup !== 'all' && subgroupToExportLabel(entry.subgroup) !== subgroup) return false
    if (group !== 'all' && entry.group !== group) return false
    return true
  }), [entries, query, region, subgroup, group])

  const regions = Array.from(new Set(entries.map(e => e.region).filter(Boolean)))
  const groups = Array.from(new Set(entries.map(e => e.group).filter(Boolean))).sort()

  async function handleImport(file: File) {
    const rows = await parseCSVFile(file)
    const imported = await importRosterRows(rows as Record<string, unknown>[], importMode)
    await refresh(`${imported.length} roster entries saved`)
  }

  async function handleSubmit() {
    if (!form.fullName.trim()) return
    await upsertRosterEntry({
      id: editingId || undefined,
      fullName: form.fullName,
      subgroup: form.subgroup,
      region: form.region || deriveRegionFromSubgroup(form.subgroup),
      group: form.group,
      active: form.active,
      source: 'manual',
    })
    setForm(EMPTY_FORM)
    setEditingId(null)
    await refresh(editingId ? 'Roster member updated' : 'Roster member added')
  }

  function startEdit(entry: ExpectedRosterEntry) {
    setEditingId(entry.id)
    setForm({ fullName: entry.fullName, subgroup: entry.subgroup, region: entry.region, group: entry.group, active: entry.active })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="section-hdr">Roster Manager</div>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-lg px-3 py-2" style={{ background: '#EBF2FB', color: '#2A5298' }}>{message}</div>
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ background: '#2A5298' }}><Upload size={14} className="inline mr-1" />Import roster CSV</button>
            <button onClick={() => downloadCsv('ors-roster-full.csv', rosterToCsv(entries))} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#EAF1FB', color: '#0D2540' }}><Download size={14} className="inline mr-1" />Export full roster</button>
            <button onClick={() => { if (confirm('Reset saved roster?')) { void (async () => { await resetExpectedRoster(); await refresh('Saved roster reset') })() } }} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#FEF2F2', color: '#991B1B' }}><RotateCcw size={14} className="inline mr-1" />Reset saved roster</button>
            {onClose ? <button onClick={onClose} className="ml-auto px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#0D2540' }}>Close</button> : null}
          </div>

          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImport(file) }} />

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold uppercase tracking-widest" style={{ color: '#6B8EB5' }}>Import mode</span>
            {(['seed','replace','merge'] as RosterImportMode[]).map(mode => (
              <button key={mode} onClick={() => setImportMode(mode)} className="px-2.5 py-1 rounded-full" style={{ background: importMode === mode ? '#D0E0F4' : '#F1F5F9', color: importMode === mode ? '#0D2540' : '#64748B' }}>{mode}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / subgroup / region" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={region} onChange={e => setRegion(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All regions</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select value={subgroup} onChange={e => setSubgroup(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All subgroups</option>{ROSTER_SUBGROUP_EXPORTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select value={group} onChange={e => setGroup(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All groups</option>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#F8FAFC', color: '#475569' }}>{filtered.length} visible / {entries.length} total</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2"><label className="text-xs text-slate-500">Full name</label><input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Subgroup</label><input value={form.subgroup} onChange={e => setForm({ ...form, subgroup: e.target.value, region: deriveRegionFromSubgroup(e.target.value) || form.region })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Region</label><input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-slate-500">Group</label><input value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
            <button onClick={() => { void handleSubmit() }} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: '#2A5298' }}><Plus size={14} className="inline mr-1" />{editingId ? 'Save changes' : 'Add member'}</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="section-hdr">Roster Entries</div>
        <table className="report-table">
          <thead><tr><th style={{ textAlign: 'left' }}>Name</th><th>Region</th><th>Subgroup</th><th>Group</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}>
                <td style={{ textAlign: 'left' }}><div className="font-semibold" style={{ color: '#0D2540' }}>{entry.fullName}</div><div className="text-[11px] text-slate-400">{entry.matchKey}</div></td>
                <td>{entry.region || '—'}</td>
                <td>{subgroupToExportLabel(entry.subgroup) || entry.subgroup || '—'}</td>
                <td>{entry.group || '—'}</td>
                <td>{entry.active ? 'Active' : 'Inactive'}</td>
                <td>{entry.source}</td>
                <td>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => startEdit(entry)} title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => { void (async () => { await setRosterEntryActive(entry.id, !entry.active); await refresh(entry.active ? 'Roster member deactivated' : 'Roster member activated') })() }} title="Toggle active"><Power size={14} /></button>
                    <button onClick={() => { void (async () => { await deleteRosterEntry(entry.id); await refresh('Roster member deleted') })() }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="section-hdr">Export by Subgroup</div>
        <div className="p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:max-w-sm">
            <label className="text-xs text-slate-500">Subgroup</label>
            <select value={exportSubgroup} onChange={e => setExportSubgroup(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {ROSTER_SUBGROUP_EXPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="text-xs text-slate-500 mt-1">Export {rosterBySubgroup(entries, exportSubgroup).length} member(s)</div>
          </div>
          <button
            onClick={() => downloadCsv(`ors-${exportSubgroup.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, rosterToCsv(rosterBySubgroup(entries, exportSubgroup)))}
            className="px-3 py-2 rounded-lg text-sm font-medium w-full md:w-auto"
            style={{ background: '#EAF1FB', color: '#0D2540' }}
          >
            <Download size={14} className="inline mr-1" />
            Export selected subgroup
          </button>
        </div>
      </div>
    </div>
  )
}
