/**
 * Attendance pipeline — equivalent of the prior Apps Script cleaning logic.
 * Takes raw Elvanto attendance export + expected roster CSV and produces a
 * fully resolved AttendanceModel.
 */

import { FT_SUBGROUP_ALIASES } from '@/lib/subgroup-aliases'

// Attendance-specific aliases — all resolve to export-style subgroup names
const ATTENDANCE_SUBGROUP_ALIASES: Record<string, string> = {
  // Central-East SGA
  'central east subgroup a':          'Central East Subgroup A',
  'central east sga':                 'Central East Subgroup A',
  'central-east sga':                 'Central East Subgroup A',
  'blw canada central east sga':      'Central East Subgroup A',
  'canada central east sga':          'Central East Subgroup A',
  'zz | central-east sga':            'Central East Subgroup A',
  // Central-East SGB
  'central east subgroup b':          'Central East Subgroup B',
  'central east sgb':                 'Central East Subgroup B',
  'central-east sgb':                 'Central East Subgroup B',
  'blw canada central east sgb':      'Central East Subgroup B',
  'canada central east sgb':          'Central East Subgroup B',
  'zz | central-east sgb':            'Central East Subgroup B',
  // Central SGA
  'central subgroup a':               'Central Subgroup A',
  'central sga':                      'Central Subgroup A',
  'blw canada central sga':           'Central Subgroup A',
  'canada central sga':               'Central Subgroup A',
  // Central SGB
  'central subgroup b':               'Central Subgroup B',
  'central sgb':                      'Central Subgroup B',
  'blw canada central sgb':           'Central Subgroup B',
  'canada central sgb':               'Central Subgroup B',
  // West SGA
  'west subgroup a':                  'West Subgroup A',
  'west sga':                         'West Subgroup A',
  'blw canada west sga':              'West Subgroup A',
  'canada west sga':                  'West Subgroup A',
  // West SGB
  'west subgroup b':                  'West Subgroup B',
  'west sgb':                         'West Subgroup B',
  'blw canada west sgb':              'West Subgroup B',
  'canada west sgb':                  'West Subgroup B',
}

// ─── RAW INPUT ────────────────────────────────────────────────────────────────

export interface RawAttendeeRow {
  firstName: string
  lastName: string
  fullName: string
  matchKey: string
  demographics: string
  location: string
  subgroup: string
  parseError: string | null
}

export interface RosterRow {
  fullName: string
  matchKey: string
  subgroup: string
  rawSubgroup: string
}

// ─── RESOLVED MODEL ───────────────────────────────────────────────────────────

export interface AttendanceRecord {
  fullName: string
  matchKey: string
  subgroup: string
  isExpected: boolean
  isPresent: boolean
  isVisitor: boolean
}

export interface SubgroupSummary {
  subgroup: string
  expected: number
  present: number
  absent: number
  visitors: number
  pct: number
}

export interface IntegrityLogEntry {
  level: 'INFO' | 'WARN' | 'ERR'
  message: string
}

export interface AttendanceModel {
  present:         AttendanceRecord[]
  absent:          AttendanceRecord[]
  visitors:        AttendanceRecord[]
  subgroupSummary: SubgroupSummary[]
  integrityLog:    IntegrityLogEntry[]
  totalExpected:   number
  totalPresent:    number
  totalAbsent:     number
  totalVisitors:   number
  overallPct:      number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim()
}

function makeMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

function findColIdx(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx >= 0) return idx
  }
  for (const c of candidates) {
    const idx = lower.findIndex(h => h.includes(c.toLowerCase()))
    if (idx >= 0) return idx
  }
  return -1
}

function findColIdxExact(headers: string[], candidates: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase())
    if (idx >= 0) return idx
  }
  return -1
}

/** Resolve a demographics / groups string to a canonical subgroup label */
function resolveSubgroup(demographics: string, groups?: string): string {
  const sources = [demographics, groups].filter(Boolean) as string[]
  for (const src of sources) {
    const lower = src.toLowerCase().trim()
    // 1. Shared subgroup aliases
    for (const [alias, canonical] of Object.entries(FT_SUBGROUP_ALIASES)) {
      if (lower.includes(alias)) return canonical
    }
    // 2. Attendance-specific alias table
    for (const [alias, canonical] of Object.entries(ATTENDANCE_SUBGROUP_ALIASES)) {
      if (lower.includes(alias)) return canonical
    }
    // 3. Regex fallback for edge cases
    if (/central.?east/i.test(lower) && /sga|subgroup.?a/i.test(lower)) return 'Central East Subgroup A'
    if (/central.?east/i.test(lower) && /sgb|subgroup.?b/i.test(lower)) return 'Central East Subgroup B'
    if (/central/i.test(lower) && !/east/i.test(lower) && /sga|subgroup.?a/i.test(lower)) return 'Central Subgroup A'
    if (/central/i.test(lower) && !/east/i.test(lower) && /sgb|subgroup.?b/i.test(lower)) return 'Central Subgroup B'
    if (/west/i.test(lower) && /sga|subgroup.?a/i.test(lower)) return 'West Subgroup A'
    if (/west/i.test(lower) && /sgb|subgroup.?b/i.test(lower)) return 'West Subgroup B'
  }
  return ''
}

// ─── ROSTER PARSER ────────────────────────────────────────────────────────────

export function parseRosterCSV(rows: Record<string, unknown>[]): {
  rosterRows: RosterRow[]
  log: IntegrityLogEntry[]
} {
  const log: IntegrityLogEntry[] = []
  if (!rows.length) { log.push({ level: 'ERR', message: 'Roster CSV is empty' }); return { rosterRows: [], log } }

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  const ci = {
    firstName:    findColIdx(headers, ['first name', 'firstname']),
    lastName:     findColIdx(headers, ['last name', 'lastname', 'surname']),
    fullName:     findColIdxExact(headers, ['fullname (auto)', 'full name (auto)', 'full name', 'fullname', 'name']),
    demographics: findColIdx(headers, ['demographics', 'demographic', 'leadership category', 'subgroup', 'category']),
    groups:       findColIdx(headers, ['groups', 'group']),
  }

  const rosterRows: RosterRow[] = []
  let missing = 0

  for (const row of rows) {
    const vals = Object.values(row)
    let fullName = ''

    if (ci.fullName >= 0) {
      fullName = str(vals[ci.fullName])
    } else if (ci.firstName >= 0 && ci.lastName >= 0) {
      const fn = str(vals[ci.firstName])
      const ln = str(vals[ci.lastName])
      fullName = `${fn} ${ln}`.trim()
    } else if (ci.firstName >= 0) {
      fullName = str(vals[ci.firstName])
    }

    if (!fullName) { missing++; continue }

    const demographics = ci.demographics >= 0 ? str(vals[ci.demographics]) : ''
    const groups       = ci.groups >= 0       ? str(vals[ci.groups])       : ''
    const subgroup     = resolveSubgroup(demographics, groups)
    const matchKey     = makeMatchKey(fullName)

    rosterRows.push({ fullName, matchKey, subgroup, rawSubgroup: demographics || groups })
    if (!subgroup) log.push({ level: 'WARN', message: `Roster: could not resolve subgroup for "${fullName}" (demographics: "${demographics || groups || '—'}")` })
  }

  if (missing) log.push({ level: 'WARN', message: `Roster: ${missing} row(s) skipped — missing name` })
  log.push({ level: 'INFO', message: `Roster: ${rosterRows.length} member(s) loaded` })
  return { rosterRows, log }
}

// ─── ELVANTO ATTENDANCE PARSER (Apps Script equivalent) ──────────────────────

export function parseElvantoAttendanceCSV(rows: Record<string, unknown>[]): {
  attendeeRows: RawAttendeeRow[]
  log: IntegrityLogEntry[]
} {
  const log: IntegrityLogEntry[] = []
  if (!rows.length) { log.push({ level: 'ERR', message: 'Elvanto attendance CSV is empty' }); return { attendeeRows: [], log } }

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  const ci = {
    firstName:    findColIdx(headers, ['first name', 'firstname']),
    lastName:     findColIdx(headers, ['last name', 'lastname', 'surname']),
    fullName:     findColIdxExact(headers, ['fullname (auto)', 'full name (auto)', 'full name', 'fullname', 'name']),
    demographics: findColIdx(headers, ['demographics', 'demographic', 'leadership category', 'category', 'subgroup']),
    groups:       findColIdx(headers, ['groups', 'group']),
    location:     findColIdx(headers, ['location', 'site']),
  }

  const attendeeRows: RawAttendeeRow[] = []
  let parseErrors = 0

  for (const row of rows) {
    const vals = Object.values(row)

    const firstName    = ci.firstName >= 0    ? str(vals[ci.firstName])    : ''
    const lastName     = ci.lastName >= 0     ? str(vals[ci.lastName])     : ''
    const rawFullName  = ci.fullName >= 0     ? str(vals[ci.fullName])     : ''
    const demographics = ci.demographics >= 0 ? str(vals[ci.demographics]) : ''
    const groups       = ci.groups >= 0       ? str(vals[ci.groups])       : ''
    const location     = ci.location >= 0     ? str(vals[ci.location])     : ''

    // Compute FullName
    let fullName = rawFullName
    if (!fullName && (firstName || lastName)) fullName = `${firstName} ${lastName}`.trim()
    if (!fullName) { parseErrors++; continue }

    const matchKey = makeMatchKey(fullName)
    const subgroup = resolveSubgroup(demographics, groups)

    const parseError = !subgroup
      ? `Could not resolve subgroup (demographics: "${demographics || groups || '—'}")`
      : null

    attendeeRows.push({ firstName, lastName, fullName, matchKey, demographics, location, subgroup, parseError })
    if (parseError) parseErrors++
  }

  if (parseErrors) log.push({ level: 'WARN', message: `Elvanto: ${parseErrors} record(s) had parse issues (subgroup unresolved or name missing)` })
  log.push({ level: 'INFO', message: `Elvanto: ${attendeeRows.length} attendance record(s) processed` })
  return { attendeeRows, log }
}

// ─── BUILD ATTENDANCE MODEL ───────────────────────────────────────────────────

export function buildAttendanceModel(
  rosterRows: RosterRow[],
  attendeeRows: RawAttendeeRow[],
  baseLog: IntegrityLogEntry[],
): AttendanceModel {
  const log: IntegrityLogEntry[] = [...baseLog]

  // Index roster by matchKey — detect duplicates
  const rosterByKey = new Map<string, RosterRow>()
  const duplicates: string[] = []
  for (const r of rosterRows) {
    if (rosterByKey.has(r.matchKey)) {
      duplicates.push(r.fullName)
    }
    rosterByKey.set(r.matchKey, r)
  }
  if (duplicates.length) {
    log.push({ level: 'WARN', message: `Roster: ${duplicates.length} duplicate MatchKey(s) detected — last entry wins: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '…' : ''}` })
  }

  // Index attendees by matchKey
  const attendeeByKey = new Map<string, RawAttendeeRow>()
  for (const a of attendeeRows) {
    attendeeByKey.set(a.matchKey, a)
  }

  const present:  AttendanceRecord[] = []
  const absent:   AttendanceRecord[] = []
  const visitors: AttendanceRecord[] = []

  // Walk roster — matched = present, unmatched = absent
  for (const r of rosterRows) {
    const matched = attendeeByKey.has(r.matchKey)
    const rec: AttendanceRecord = {
      fullName:   r.fullName,
      matchKey:   r.matchKey,
      subgroup:   r.subgroup,
      isExpected: true,
      isPresent:  matched,
      isVisitor:  false,
    }
    if (matched) {
      present.push(rec)
      attendeeByKey.delete(r.matchKey) // consumed
    } else {
      absent.push(rec)
    }
  }

  // Remaining attendees = visitors / unmatched
  for (const a of attendeeByKey.values()) {
    visitors.push({
      fullName:   a.fullName,
      matchKey:   a.matchKey,
      subgroup:   a.subgroup,
      isExpected: false,
      isPresent:  true,
      isVisitor:  true,
    })
  }

  // Sort
  present.sort((a, b)  => a.subgroup.localeCompare(b.subgroup) || a.fullName.localeCompare(b.fullName))
  absent.sort((a, b)   => a.subgroup.localeCompare(b.subgroup) || a.fullName.localeCompare(b.fullName))
  visitors.sort((a, b) => a.fullName.localeCompare(b.fullName))

  // Subgroup summary
  const sgMap = new Map<string, { expected: number; present: number; absent: number; visitors: number }>()
  const allSubgroups = new Set<string>([
    ...rosterRows.map(r => r.subgroup || '(Unassigned)'),
    ...visitors.map(v => v.subgroup || '(Unassigned)'),
  ])
  for (const sg of allSubgroups) {
    sgMap.set(sg, { expected: 0, present: 0, absent: 0, visitors: 0 })
  }
  for (const r of present) {
    const key = r.subgroup || '(Unassigned)'
    const s = sgMap.get(key) ?? { expected: 0, present: 0, absent: 0, visitors: 0 }
    s.expected++; s.present++
    sgMap.set(key, s)
  }
  for (const r of absent) {
    const key = r.subgroup || '(Unassigned)'
    const s = sgMap.get(key) ?? { expected: 0, present: 0, absent: 0, visitors: 0 }
    s.expected++; s.absent++
    sgMap.set(key, s)
  }
  for (const v of visitors) {
    const key = v.subgroup || '(Unassigned)'
    const s = sgMap.get(key) ?? { expected: 0, present: 0, absent: 0, visitors: 0 }
    s.visitors++
    sgMap.set(key, s)
  }

  const subgroupSummary: SubgroupSummary[] = Array.from(sgMap.entries())
    .map(([subgroup, d]) => ({
      subgroup,
      expected: d.expected,
      present:  d.present,
      absent:   d.absent,
      visitors: d.visitors,
      pct:      d.expected ? Math.round((d.present / d.expected) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.subgroup.localeCompare(b.subgroup))

  const totalExpected = rosterRows.length
  const totalPresent  = present.length
  const totalAbsent   = absent.length
  const totalVisitors = visitors.length
  const overallPct    = totalExpected ? Math.round((totalPresent / totalExpected) * 1000) / 10 : 0

  log.push({ level: 'INFO', message: `Matched ${totalPresent} of ${totalExpected} expected attendees` })
  if (totalVisitors) log.push({ level: 'INFO', message: `${totalVisitors} unmatched attendee(s) flagged as visitors` })

  return { present, absent, visitors, subgroupSummary, integrityLog: log, totalExpected, totalPresent, totalAbsent, totalVisitors, overallPct }
}
