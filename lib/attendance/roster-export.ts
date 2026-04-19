import type { ExpectedRosterEntry } from './roster-storage'
import { subgroupToExportLabel } from './roster-storage'

const HEADERS = ['Subgroup', 'Leadership Category', 'Active', 'FullName (auto)']

function escapeCell(value: unknown) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function rosterToCsv(entries: ExpectedRosterEntry[]): string {
  const lines = [HEADERS.join(',')]
  for (const entry of entries) {
    const subgroupLabel = subgroupToExportLabel(entry.subgroup)
    const row = [
      subgroupLabel,
      subgroupLabel,
      entry.active ? 'TRUE' : 'FALSE',
      entry.fullName,
    ]
    lines.push(row.map(escapeCell).join(','))
  }
  return lines.join('\n')
}

export function rosterBySubgroup(entries: ExpectedRosterEntry[], subgroupLabel: string) {
  return entries.filter(entry => subgroupToExportLabel(entry.subgroup) === subgroupLabel)
}

export function downloadCsv(filename: string, csvText: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
