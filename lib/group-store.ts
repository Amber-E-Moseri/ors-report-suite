'use client'

import type { FollowUpSubgroup } from '@/types'
import { FOLLOW_UP_SUBGROUPS } from '@/types'
import { parseGroupRows } from './parsers'

const STORAGE_KEY = 'blw_groups_v2'
const LEGACY_STORAGE_KEY = 'blw_groups_v1'

export interface StoredGroup {
  name: string
  subgroup: FollowUpSubgroup | ''
  totalMembers: number
}

export interface StoredGroupPayload {
  version: 2
  savedAt: string
  groups: StoredGroup[]
}

function normaliseGroups(input: unknown): StoredGroup[] {
  if (!Array.isArray(input)) return []

  const cleaned = input
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const subgroup = typeof row.subgroup === 'string' ? row.subgroup : ''
      const totalMembers = Number(row.totalMembers)
      if (!name) return null
      return {
        name,
        subgroup: subgroup as FollowUpSubgroup | '',
        totalMembers: Number.isFinite(totalMembers) && totalMembers >= 0 ? totalMembers : 0,
      } satisfies StoredGroup
    })
    .filter((row): row is StoredGroup => Boolean(row))

  const deduped = new Map<string, StoredGroup>()
  for (const group of cleaned) deduped.set(group.name.toLowerCase(), group)

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.subgroup < b.subgroup) return -1
    if (a.subgroup > b.subgroup) return 1
    return a.name.localeCompare(b.name)
  })
}

export function loadStoredGroups(): StoredGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredGroupPayload).groups)) {
        return normaliseGroups((parsed as StoredGroupPayload).groups)
      }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return []
    const migrated = normaliseGroups(JSON.parse(legacy))
    saveStoredGroups(migrated)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return migrated
  } catch {
    return []
  }
}

export function saveStoredGroups(groups: StoredGroup[]): void {
  try {
    const payload: StoredGroupPayload = {
      version: 2,
      savedAt: new Date().toISOString(),
      groups: normaliseGroups(groups),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function clearStoredGroups(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function exportStoredGroups(groups: StoredGroup[]): string {
  const payload: StoredGroupPayload = {
    version: 2,
    savedAt: new Date().toISOString(),
    groups: normaliseGroups(groups),
  }
  return JSON.stringify(payload, null, 2)
}

export function importStoredGroupsFromText(text: string): StoredGroup[] {
  const parsed = JSON.parse(text) as unknown

  if (Array.isArray(parsed)) return normaliseGroups(parsed)

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as StoredGroupPayload).groups)) {
    return normaliseGroups((parsed as StoredGroupPayload).groups)
  }

  throw new Error('Invalid group backup file.')
}

export function mergeCSVIntoStore(
  csvRows: Record<string, unknown>[],
  existing: StoredGroup[],
): StoredGroup[] {
  const parsed = parseGroupRows(csvRows)
  const incoming: StoredGroup[] = []

  parsed.byName.forEach((info, name) => {
    incoming.push({
      name,
      subgroup: info.subgroup ?? '',
      totalMembers: info.members,
    })
  })

  const map = new Map<string, StoredGroup>(existing.map(g => [g.name.toLowerCase(), g]))
  for (const g of incoming) {
    map.set(g.name.toLowerCase(), g)
  }
  return normaliseGroups(Array.from(map.values()))
}

export function storedGroupsToDirectory(groups: StoredGroup[]) {
  const rows = groups.map(g => ({
    name: g.name,
    categories: g.subgroup,
    'total members': String(g.totalMembers),
  })) as Record<string, unknown>[]
  return parseGroupRows(rows)
}

export function blankGroup(): StoredGroup {
  return { name: '', subgroup: '', totalMembers: 0 }
}

export const SUBGROUP_OPTIONS: Array<{ value: FollowUpSubgroup | ''; label: string }> = [
  { value: '', label: '— Unassigned —' },
  ...FOLLOW_UP_SUBGROUPS.map(sg => ({ value: sg, label: sg })),
]
