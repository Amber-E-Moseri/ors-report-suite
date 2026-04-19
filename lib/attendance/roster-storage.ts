'use client'

import { createSupabaseBrowserClient } from '../supabase/client'

const STORAGE_KEY = 'ors_roster_expected_v1'

export const ROSTER_SUBGROUP_EXPORTS = [
  'Central East Subgroup A',
  'Central East Subgroup B',
  'Central Subgroup A',
  'Central Subgroup B',
  'West Subgroup A',
  'West Subgroup B',
] as const

export type RosterExportSubgroup = (typeof ROSTER_SUBGROUP_EXPORTS)[number]

export interface ExpectedRosterEntry {
  id: string
  fullName: string
  matchKey: string
  subgroup: string
  region: string
  group: string
  active: boolean
  addedAt: string
  updatedAt: string
  source: 'import' | 'manual' | 'attendance-prompt'
}

export interface ExpectedRosterStore {
  members: ExpectedRosterEntry[]
}

interface SupabaseRosterRow {
  id: string
  owner_id: string
  full_name: string
  subgroup: string
  leadership_category: string | null
  active: boolean
  created_at: string
}

export function makeMatchKey(name: string): string {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

export function deriveRegionFromSubgroup(subgroup: string): string {
  const lower = String(subgroup || '').toLowerCase()
  if (lower.includes('central-east') || lower.includes('central east')) return 'Central East'
  if (lower.includes('west')) return 'West'
  if (lower.includes('central')) return 'Central'
  return ''
}

export function subgroupToExportLabel(subgroup: string): string {
  const lower = String(subgroup || '').toLowerCase()
  if (lower.includes('central-east') || lower.includes('central east')) {
    if (lower.includes('sga') || lower.includes('subgroup a')) return 'Central East Subgroup A'
    if (lower.includes('sgb') || lower.includes('subgroup b')) return 'Central East Subgroup B'
  }
  if (lower.includes('west')) {
    if (lower.includes('sga') || lower.includes('subgroup a')) return 'West Subgroup A'
    if (lower.includes('sgb') || lower.includes('subgroup b')) return 'West Subgroup B'
  }
  if (lower.includes('central')) {
    if (lower.includes('sga') || lower.includes('subgroup a')) return 'Central Subgroup A'
    if (lower.includes('sgb') || lower.includes('subgroup b')) return 'Central Subgroup B'
  }
  return subgroup || ''
}

function uid() {
  return `roster_${Math.random().toString(36).slice(2, 10)}`
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

async function getCurrentUserId() {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

export function normalizeRosterEntry(input: Partial<ExpectedRosterEntry> & { fullName: string }): ExpectedRosterEntry {
  const now = new Date().toISOString()
  const subgroup = String(input.subgroup || '').trim()
  const region = String(input.region || '').trim() || deriveRegionFromSubgroup(subgroup)
  return {
    id: input.id || uid(),
    fullName: String(input.fullName || '').trim(),
    matchKey: makeMatchKey(input.fullName || ''),
    subgroup,
    region,
    group: String(input.group || '').trim(),
    active: input.active ?? true,
    addedAt: input.addedAt || now,
    updatedAt: now,
    source: input.source || 'manual',
  }
}

function loadRosterStoreFromLocal(): ExpectedRosterStore {
  if (!canUseStorage()) return { members: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { members: [] }
    const parsed = JSON.parse(raw) as ExpectedRosterStore
    if (!parsed || !Array.isArray(parsed.members)) return { members: [] }
    return {
      members: parsed.members
        .filter(m => m && typeof m.fullName === 'string')
        .map(m => normalizeRosterEntry(m)),
    }
  } catch {
    return { members: [] }
  }
}

function saveRosterStoreToLocal(store: ExpectedRosterStore) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ members: store.members }))
}

function mapSupabaseToEntry(row: SupabaseRosterRow): ExpectedRosterEntry {
  const fullName = String(row.full_name || '').trim()
  const subgroup = String(row.subgroup || '').trim()
  return {
    id: row.id,
    fullName,
    matchKey: makeMatchKey(fullName),
    subgroup,
    region: deriveRegionFromSubgroup(subgroup),
    group: String(row.leadership_category || '').trim(),
    active: Boolean(row.active),
    addedAt: row.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'import',
  }
}

async function replaceSupabaseRoster(ownerId: string, entries: ExpectedRosterEntry[]) {
  const supabase = createSupabaseBrowserClient()
  await supabase.from('attendance_expected_roster').delete().eq('owner_id', ownerId)

  if (!entries.length) return

  const payload = entries.map(entry => ({
    owner_id: ownerId,
    full_name: entry.fullName,
    subgroup: entry.subgroup,
    leadership_category: entry.group || null,
    active: entry.active,
  }))
  await supabase.from('attendance_expected_roster').insert(payload)
}

export async function getExpectedRoster(): Promise<ExpectedRosterEntry[]> {
  try {
    const userId = await getCurrentUserId()
    if (userId) {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('attendance_expected_roster')
        .select('id,owner_id,full_name,subgroup,leadership_category,active,created_at')
        .eq('owner_id', userId)
        .order('full_name', { ascending: true })

      if (!error && Array.isArray(data)) {
        const members = (data as SupabaseRosterRow[]).map(mapSupabaseToEntry)
        const normalized = members.map(m => normalizeRosterEntry(m)).sort((a, b) => a.fullName.localeCompare(b.fullName))
        saveRosterStoreToLocal({ members: normalized })
        return normalized
      }
    }
  } catch {
    // fall through to local
  }

  return loadRosterStoreFromLocal().members.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export async function setExpectedRoster(entries: ExpectedRosterEntry[]) {
  const normalized = entries.map(e => normalizeRosterEntry(e))
  saveRosterStoreToLocal({ members: normalized })

  try {
    const userId = await getCurrentUserId()
    if (!userId) return
    await replaceSupabaseRoster(userId, normalized)
  } catch {
    // ignore sync errors
  }
}

export async function resetExpectedRoster() {
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY)

  try {
    const userId = await getCurrentUserId()
    if (!userId) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('attendance_expected_roster').delete().eq('owner_id', userId)
  } catch {
    // ignore
  }
}

export async function upsertRosterEntry(entry: Partial<ExpectedRosterEntry> & { fullName: string }) {
  const current = await getExpectedRoster()
  const normalized = normalizeRosterEntry(entry)
  const idx = current.findIndex(m => m.id === normalized.id || m.matchKey === normalized.matchKey)

  let next = [...current]
  if (idx >= 0) {
    const existing = next[idx]
    normalized.addedAt = existing.addedAt
    next[idx] = { ...existing, ...normalized, updatedAt: new Date().toISOString() }
  } else {
    next.push(normalized)
  }
  next.sort((a, b) => a.fullName.localeCompare(b.fullName))

  await setExpectedRoster(next)
  return normalized
}

export async function deleteRosterEntry(id: string) {
  const current = await getExpectedRoster()
  const next = current.filter(m => m.id !== id)
  await setExpectedRoster(next)
}

export async function setRosterEntryActive(id: string, active: boolean) {
  const current = await getExpectedRoster()
  const next = current.map(m => m.id === id ? { ...m, active, updatedAt: new Date().toISOString() } : m)
  await setExpectedRoster(next)
}

export type RosterImportMode = 'seed' | 'replace' | 'merge'

export async function applyRosterImport(entries: ExpectedRosterEntry[], mode: RosterImportMode) {
  const normalizedIncoming = entries.map(e => normalizeRosterEntry({ ...e, source: e.source || 'import' }))

  if (mode === 'replace' || mode === 'seed') {
    await setExpectedRoster(normalizedIncoming)
    return getExpectedRoster()
  }

  const current = await getExpectedRoster()
  const byKey = new Map<string, ExpectedRosterEntry>()
  for (const item of current) byKey.set(item.matchKey, item)

  for (const item of normalizedIncoming) {
    const existing = byKey.get(item.matchKey)
    byKey.set(item.matchKey, existing ? { ...existing, ...item, addedAt: existing.addedAt } : item)
  }

  const merged = Array.from(byKey.values())
  await setExpectedRoster(merged)
  return getExpectedRoster()
}

export { STORAGE_KEY as EXPECTED_ROSTER_STORAGE_KEY }
