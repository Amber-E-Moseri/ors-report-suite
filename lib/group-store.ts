'use client'

import type { FollowUpSubgroup } from '@/types'
import { FOLLOW_UP_SUBGROUPS } from '@/types'
import { parseGroupRows } from './parsers'
import { createSupabaseBrowserClient } from './supabase/client'

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

interface FollowupGroupRow {
  id: string
  owner_id: string
  group_name: string
  subgroup: string
  total_members: number
  created_at: string
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

async function getCurrentUserId() {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

function loadStoredGroupsFromLocal(): StoredGroup[] {
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
    saveStoredGroupsToLocal(migrated)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return migrated
  } catch {
    return []
  }
}

function saveStoredGroupsToLocal(groups: StoredGroup[]): void {
  try {
    const payload: StoredGroupPayload = {
      version: 2,
      savedAt: new Date().toISOString(),
      groups: normaliseGroups(groups),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage issues
  }
}

export async function loadStoredGroups(): Promise<StoredGroup[]> {
  try {
    const userId = await getCurrentUserId()
    if (userId) {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('followup_groups')
        .select('id,owner_id,group_name,subgroup,total_members,created_at')
        .eq('owner_id', userId)
        .order('group_name', { ascending: true })

      if (!error && Array.isArray(data) && data.length > 0) {
        const rows = (data as FollowupGroupRow[]).map(row => ({
          name: String(row.group_name || '').trim(),
          subgroup: (String(row.subgroup || '') as FollowUpSubgroup | ''),
          totalMembers: Number(row.total_members) || 0,
        }))
        const normalized = normaliseGroups(rows)
        saveStoredGroupsToLocal(normalized)
        return normalized
      }

      // One-time migration path:
      // If a user has no owner-scoped rows, try to claim legacy rows with null owner_id.
      const { data: legacyRows, error: legacyError } = await supabase
        .from('followup_groups')
        .select('id,owner_id,group_name,subgroup,total_members,created_at')
        .is('owner_id', null)
        .order('group_name', { ascending: true })

      if (!legacyError && Array.isArray(legacyRows) && legacyRows.length > 0) {
        const legacyIds = legacyRows.map(row => String((row as FollowupGroupRow).id))
        if (legacyIds.length > 0) {
          await supabase
            .from('followup_groups')
            .update({ owner_id: userId })
            .in('id', legacyIds)
        }

        const claimedRows = (legacyRows as FollowupGroupRow[]).map(row => ({
          name: String(row.group_name || '').trim(),
          subgroup: (String(row.subgroup || '') as FollowUpSubgroup | ''),
          totalMembers: Number(row.total_members) || 0,
        }))
        const normalized = normaliseGroups(claimedRows)
        saveStoredGroupsToLocal(normalized)
        return normalized
      }
    }
  } catch {
    // fall through to local
  }
  return loadStoredGroupsFromLocal()
}

export async function saveStoredGroups(groups: StoredGroup[]): Promise<void> {
  const normalized = normaliseGroups(groups)
  saveStoredGroupsToLocal(normalized)

  try {
    const userId = await getCurrentUserId()
    if (!userId) return
    const supabase = createSupabaseBrowserClient()

    const { error: deleteError } = await supabase
      .from('followup_groups')
      .delete()
      .eq('owner_id', userId)
    if (deleteError) return

    if (!normalized.length) return
    const payload = normalized.map(group => ({
      owner_id: userId,
      group_name: group.name,
      subgroup: group.subgroup,
      total_members: group.totalMembers,
    }))
    await supabase.from('followup_groups').insert(payload)
  } catch {
    // ignore sync errors
  }
}

export async function clearStoredGroups(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignore
  }

  try {
    const userId = await getCurrentUserId()
    if (!userId) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('followup_groups').delete().eq('owner_id', userId)
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
  { value: '', label: '- Unassigned -' },
  ...FOLLOW_UP_SUBGROUPS.map(sg => ({ value: sg, label: sg })),
]
