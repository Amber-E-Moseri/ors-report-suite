import type { ExpectedRosterEntry, RosterImportMode } from './roster-storage'
import { applyRosterImport, deriveRegionFromSubgroup, makeMatchKey, subgroupToExportLabel } from './roster-storage'

function findValue(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row)
  for (const name of names) {
    const hit = entries.find(([key]) => key.toLowerCase().trim() === name)
    if (hit) return String(hit[1] ?? '').trim()
  }
  for (const name of names) {
    const hit = entries.find(([key]) => key.toLowerCase().includes(name))
    if (hit) return String(hit[1] ?? '').trim()
  }
  return ''
}

function findExactValue(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row)
  for (const name of names) {
    const hit = entries.find(([key]) => key.toLowerCase().trim() === name)
    if (hit) return String(hit[1] ?? '').trim()
  }
  return ''
}

function parseActiveFlag(raw: string): boolean {
  const normalized = String(raw || '').trim().toLowerCase()
  if (!normalized) return true
  if (['false', 'f', 'no', 'n', '0', 'inactive'].includes(normalized)) return false
  return true
}

export function rosterRowsFromCsv(rows: Record<string, unknown>[]): ExpectedRosterEntry[] {
  const entries: ExpectedRosterEntry[] = []
  for (const [index, row] of rows.entries()) {
    const firstName = findValue(row, ['first name', 'firstname'])
    const lastName = findValue(row, ['last name', 'lastname', 'surname'])
    const fullName = findExactValue(row, ['fullname (auto)', 'full name (auto)', 'full name', 'fullname', 'name']) || `${firstName} ${lastName}`.trim()
    if (!fullName) continue
    const subgroupInput = findValue(row, ['subgroup', 'leadership category', 'leadershipcategory', 'demographics', 'category'])
    const subgroup = subgroupToExportLabel(subgroupInput)
    const region = findValue(row, ['region']) || deriveRegionFromSubgroup(subgroup)
    const group = findValue(row, ['group', 'groups'])
    const active = parseActiveFlag(findValue(row, ['active', 'is active', 'status']))
    entries.push({
      id: `import_${index}_${makeMatchKey(fullName)}`,
      fullName,
      matchKey: makeMatchKey(fullName),
      subgroup,
      region,
      group,
      active,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'import',
    })
  }
  return entries
}

export async function importRosterRows(rows: Record<string, unknown>[], mode: RosterImportMode) {
  const entries = rosterRowsFromCsv(rows)
  return await applyRosterImport(entries, mode)
}
