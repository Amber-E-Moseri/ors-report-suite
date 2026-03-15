import type {
  GroupDirectory,
  GroupInfo,
  SubgroupGroupData,
  NotesData,
  NoteAgg,
  FTParsedSheet,
  AllFTData,
  ParsedFTRow,
  FTHierarchyEntry,
  FollowUpSubgroup,
} from '@/types'

import {
  FT_SUBGROUPS,
  CATEGORY_MAP,
} from '@/types'

import { FT_SUBGROUP_ALIASES } from '@/lib/subgroup-aliases'

// ─── UTILS ────────────────────────────────────────────────────────────────────

export function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

export function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v ?? '').replace(/[, ]+/g, ''))
  return isNaN(n) ? 0 : n
}

export function safeRatio(num: unknown, den: unknown): number {
  const n = toNum(num), d = toNum(den)
  return d ? Math.max(0, Math.min(1, n / d)) : 0
}

export function pctText(r: number): string {
  return `${Math.round(Math.max(0, Math.min(1, r)) * 1000) / 10}%`
}

function coerceDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = String(v ?? '').trim()
  if (!s) return null

  // ISO / unambiguous formats — try native parse first
  const direct = new Date(s)
  if (!isNaN(direct.getTime())) return direct

  // DD/MM/YYYY or D/M/YYYY (Elvanto raw export format)
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    if (!isNaN(d.getTime())) return d
  }

  // DD-MM-YYYY or D-M-YYYY
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (dmyDash) {
    const d = new Date(Number(dmyDash[3]), Number(dmyDash[2]) - 1, Number(dmyDash[1]))
    if (!isNaN(d.getTime())) return d
  }

  return null
}

export function formatDateRange(min: Date | null, max: Date | null): string {
  if (!min) return '(date range unavailable)'
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  if (!max || min.toDateString() === max.toDateString()) return fmt(min)
  return `${fmt(min)} – ${fmt(max)}`
}

function findCol(hdrs: string[], names: string[], fallback: number): number {
  // 1. Exact match
  for (const n of names) {
    const i = hdrs.indexOf(n.toLowerCase())
    if (i >= 0) return i
  }
  // 2. Substring match (catches invisible chars, minor variations)
  for (const n of names) {
    const i = hdrs.findIndex(h => h.includes(n.toLowerCase()))
    if (i >= 0) return i
  }
  return fallback
}

// ─── SHARED GROUP RESOLVER ───────────────────────────────────────────────────
// Handles comma-separated group strings: tries last segment, then first.

export function resolveGroupName(
  rawGroup: string,
  byName: Map<string, GroupInfo>,
): { resolvedGroup: string; groupInfo: GroupInfo | undefined } {
  let resolvedGroup = rawGroup
  let groupInfo = byName.get(rawGroup)
  if (!groupInfo && rawGroup.includes(',')) {
    const parts = rawGroup.split(',').map(p => p.trim()).filter(Boolean)
    resolvedGroup = parts[parts.length - 1]
    groupInfo = byName.get(resolvedGroup)
    if (!groupInfo) {
      resolvedGroup = parts[0]
      groupInfo = byName.get(resolvedGroup)
    }
  }
  return { resolvedGroup, groupInfo }
}

// ─── GROUP DIRECTORY PARSER ───────────────────────────────────────────────────

export function parseGroupRows(rows: Record<string, unknown>[]): GroupDirectory {
  const byName     = new Map<string, GroupInfo>()
  const bySubgroup = new Map<FollowUpSubgroup, SubgroupGroupData>()

  if (!rows.length) return { byName, bySubgroup }

  const hdrs = Object.keys(rows[0]).map(h => h.toLowerCase())
  const ci = {
    name:    findCol(hdrs, ['name'], 0),
    cat:     findCol(hdrs, ['categories', 'category'], 1),
    members: findCol(hdrs, ['total members', 'members'], 2),
  }

  for (const row of rows) {
    const vals = Object.values(row)
    const nm  = str(vals[ci.name])
    const cat = str(vals[ci.cat])
    const mem = toNum(vals[ci.members])
    if (!nm) continue

    const subgroup = CATEGORY_MAP[cat] ?? null
    const adjustedMembers = Math.max(0, mem - 1)
    byName.set(nm, { subgroup, members: mem, adjustedMembers })

    if (subgroup) {
      if (!bySubgroup.has(subgroup)) {
        bySubgroup.set(subgroup, { groups: [], totalMembers: 0, adjustedMembers: 0 })
      }
      const sub = bySubgroup.get(subgroup)!
      sub.groups.push(nm)
      sub.totalMembers += mem
      sub.adjustedMembers += adjustedMembers
    }
  }

  return { byName, bySubgroup }
}

// ─── NOTES AGGREGATOR ────────────────────────────────────────────────────────

function emptyAgg(): NoteAgg {
  return { totalNotes: 0, people: new Set(), groupsActive: new Set(), leaders: new Set() }
}

export function aggregateNotes(
  rows: Record<string, unknown>[],
  byName: Map<string, GroupInfo>,
): NotesData {
  const bySubgroup = new Map<string, NoteAgg>()
  const byGroup    = new Map<string, NoteAgg>()
  const byLeader   = new Map<string, Map<string, { notes: number }>>()
  let minDate: Date | null = null
  let maxDate: Date | null = null

  if (!rows.length) return { bySubgroup, byGroup, byLeader, rangeText: '(no data)' }

  const hdrs = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  const ci = {
    // Raw Elvanto: "Created By"  |  Cleaned: "leader"
    leader:  findCol(hdrs, ['created by', 'leader'], 1),
    // Raw Elvanto: "Groups"      |  Cleaned: "group name", "groupname", "group"
    group:   findCol(hdrs, ['groups', 'groupname', 'group name', 'group'], 3),
    // Raw Elvanto: "Person"      |  Cleaned: "contact name", "contactname", "name"
    contact: findCol(hdrs, ['person', 'contactname', 'contact name', 'name'], 2),
    // Raw Elvanto: "Note Date"   |  Cleaned: "date", "created", "note date"
    date:    findCol(hdrs, ['note date', 'date', 'created'], -1),
  }

  for (const row of rows) {
    const vals    = Object.values(row)
    const leader  = str(vals[ci.leader])
    const contact = str(vals[ci.contact])
    const rawGroup = str(vals[ci.group])

    if (!leader) continue

    // Date range
    if (ci.date >= 0) {
      const d = coerceDate(vals[ci.date])
      if (d) {
        if (!minDate || d < minDate) minDate = d
        if (!maxDate || d > maxDate) maxDate = d
      }
    }

    // Resolve group (handles comma-separated: try last, then first)
    const { resolvedGroup, groupInfo } = resolveGroupName(rawGroup, byName)

    const subgroup = groupInfo?.subgroup ?? null

    // byGroup
    if (resolvedGroup) {
      if (!byGroup.has(resolvedGroup)) byGroup.set(resolvedGroup, emptyAgg())
      const g = byGroup.get(resolvedGroup)!
      g.totalNotes++
      if (contact) g.people.add(contact)
      g.groupsActive.add(resolvedGroup)
      g.leaders.add(leader)
    }

    // bySubgroup
    if (subgroup) {
      if (!bySubgroup.has(subgroup)) bySubgroup.set(subgroup, emptyAgg())
      const s = bySubgroup.get(subgroup)!
      s.totalNotes++
      if (contact) s.people.add(contact)
      if (resolvedGroup) s.groupsActive.add(resolvedGroup)
      s.leaders.add(leader)
    }

    // byLeader × subgroup (includes unresolved as null key '(Unassigned)')
    const leaderKey = subgroup ?? '(Unassigned)'
    if (leader) {
      if (!byLeader.has(leaderKey)) byLeader.set(leaderKey, new Map())
      const lm = byLeader.get(leaderKey)!
      if (!lm.has(leader)) lm.set(leader, { notes: 0 })
      lm.get(leader)!.notes++
    }
  }

  return { bySubgroup, byGroup, byLeader, rangeText: formatDateRange(minDate, maxDate) }
}

// ─── FT DEMOGRAPHIC PARSER ───────────────────────────────────────────────────

export function parseFTDemographics(
  raw: string,
  groupsRaw?: string,
): { subgroup: string; fellowship: string } {
  const sources = [raw, groupsRaw].filter(Boolean) as string[]

  for (const src of sources) {
    const trimmed = src.trim()
    const lower   = trimmed.toLowerCase()

    // 1. Direct match against canonical FT subgroup names
    for (const known of FT_SUBGROUPS) {
      if (lower.includes(known.toLowerCase())) {
        const rem = trimmed.replace(new RegExp(known.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
          .replace(/^[\s,]+|[\s,]+$/g, '').trim()
        return { subgroup: known, fellowship: rem }
      }
    }

    // 2. Alias table
    for (const [alias, canonical] of Object.entries(FT_SUBGROUP_ALIASES)) {
      if (lower.includes(alias)) {
        const rem = trimmed.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
          .replace(/^[\s,]+|[\s,]+$/g, '').trim()
        return { subgroup: canonical, fellowship: rem }
      }
    }

    // 3. Regex fallback patterns
    if (/central.?east/i.test(lower) && /sga|subgroup.?a/i.test(lower))
      return { subgroup: 'Central East Subgroup A', fellowship: trimmed }
    if (/central.?east/i.test(lower) && /sgb|subgroup.?b/i.test(lower))
      return { subgroup: 'Central East Subgroup B', fellowship: trimmed }
    if (/central/i.test(lower) && !/east/i.test(lower) && /sga|subgroup.?a/i.test(lower))
      return { subgroup: 'Central Subgroup A', fellowship: trimmed }
    if (/central/i.test(lower) && !/east/i.test(lower) && /sgb|subgroup.?b/i.test(lower))
      return { subgroup: 'Central Subgroup B', fellowship: trimmed }
    if (/west/i.test(lower) && /sga|subgroup.?a/i.test(lower))
      return { subgroup: 'West Subgroup A', fellowship: trimmed }
    if (/west/i.test(lower) && /sgb|subgroup.?b/i.test(lower))
      return { subgroup: 'West Subgroup B', fellowship: trimmed }
  }

  return { subgroup: '', fellowship: raw ? raw.trim() : '' }
}

// ─── FT SHEET PARSER ─────────────────────────────────────────────────────────

export function parseFTRows(rows: Record<string, unknown>[]): FTParsedSheet {
  const empty: FTParsedSheet = {
    hierarchyMap: {}, grandTotal: 0, unmatchedRows: 0, minDate: null, maxDate: null, rows: [],
  }
  if (!rows.length) return empty

  const hdrs = Object.keys(rows[0]).map(h => h.toLowerCase())
  const ci = {
    fullName:     findCol(hdrs, ['full name', 'fullname', 'name'], 0),
    groups:       findCol(hdrs, ['groups', 'group'], 1),
    demographics: findCol(hdrs, ['demographics', 'demographic'], 2),
    dateAdded:    findCol(hdrs, ['date added', 'dateadded', 'date'], 3),
  }

  const hierarchyMap: Record<string, FTHierarchyEntry> = {}
  const parsedRows: ParsedFTRow[] = []
  let grandTotal = 0, unmatchedRows = 0, minDate: Date | null = null, maxDate: Date | null = null

  for (const row of rows) {
    const vals        = Object.values(row)
    const fullName    = str(vals[ci.fullName])
    const rawGroups   = str(vals[ci.groups])
    const demographics = str(vals[ci.demographics])
    const rawDate     = ci.dateAdded >= 0 ? vals[ci.dateAdded] : null

    if (!fullName) continue

    const d = coerceDate(rawDate)
    if (d) {
      if (!minDate || d < minDate) minDate = d
      if (!maxDate || d > maxDate) maxDate = d
    }

    const { subgroup, fellowship } = parseFTDemographics(demographics, rawGroups)
    const group  = rawGroups || '(No Group)'
    const subKey = subgroup || '(No Subgroup)'

    if (!subgroup) unmatchedRows++

    if (!hierarchyMap[subKey]) hierarchyMap[subKey] = { total: 0, groups: {} }
    hierarchyMap[subKey].total++
    hierarchyMap[subKey].groups[group] = (hierarchyMap[subKey].groups[group] ?? 0) + 1

    parsedRows.push({ fullName, group, subgroup: subKey, fellowship })
    grandTotal++
  }

  return { hierarchyMap, grandTotal, unmatchedRows, minDate, maxDate, rows: parsedRows }
}

export function mergeFTHierarchy(
  mapA: Record<string, FTHierarchyEntry>,
  mapB: Record<string, FTHierarchyEntry>,
): Record<string, FTHierarchyEntry> {
  const merged = JSON.parse(JSON.stringify(mapA)) as Record<string, FTHierarchyEntry>
  for (const [sub, subData] of Object.entries(mapB)) {
    if (!merged[sub]) merged[sub] = { total: 0, groups: {} }
    merged[sub].total += subData.total
    for (const [g, count] of Object.entries(subData.groups)) {
      merged[sub].groups[g] = (merged[sub].groups[g] ?? 0) + count
    }
  }
  return merged
}

export function buildAllFTData(
  cellData: FTParsedSheet,
  serviceData: FTParsedSheet,
): AllFTData {
  const combinedMap   = mergeFTHierarchy(cellData.hierarchyMap, serviceData.hierarchyMap)
  const combinedTotal = cellData.grandTotal + serviceData.grandTotal
  const combinedRows  = [...cellData.rows, ...serviceData.rows]
  const mins = [cellData.minDate, serviceData.minDate].filter(Boolean) as Date[]
  const maxs = [cellData.maxDate, serviceData.maxDate].filter(Boolean) as Date[]
  return {
    cellData,
    serviceData,
    combinedData: { hierarchyMap: combinedMap, grandTotal: combinedTotal, rows: combinedRows },
    globalMin: mins.length ? mins.reduce((a, b) => a < b ? a : b) : null,
    globalMax: maxs.length ? maxs.reduce((a, b) => a > b ? a : b) : null,
  }
}
