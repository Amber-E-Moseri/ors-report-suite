import type { RawAttendeeRow } from './attendance-parser'
import type { ExpectedRosterEntry } from './roster-storage'
import { deriveRegionFromSubgroup, makeMatchKey, normalizeRosterEntry } from './roster-storage'

export type UnmatchedAction = 'pending' | 'add' | 'visitor' | 'ignore'

export interface UnmatchedReviewItem {
  id: string
  fullName: string
  matchKey: string
  subgroup: string
  region: string
  group: string
  parseIssue: string | null
  action: UnmatchedAction
}

export function buildUnmatchedReviewItems(attendees: RawAttendeeRow[], roster: { matchKey: string }[]): UnmatchedReviewItem[] {
  const rosterKeys = new Set(roster.map(r => r.matchKey))
  const seen = new Set<string>()
  const items: UnmatchedReviewItem[] = []
  for (const attendee of attendees) {
    if (!attendee.fullName) continue
    if (rosterKeys.has(attendee.matchKey) || seen.has(attendee.matchKey)) continue
    seen.add(attendee.matchKey)
    items.push({
      id: `unmatched_${attendee.matchKey}`,
      fullName: attendee.fullName,
      matchKey: attendee.matchKey || makeMatchKey(attendee.fullName),
      subgroup: attendee.subgroup || '',
      region: deriveRegionFromSubgroup(attendee.subgroup || ''),
      group: attendee.location || '',
      parseIssue: attendee.parseError,
      action: 'pending',
    })
  }
  return items.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function unmatchedToRosterEntry(item: UnmatchedReviewItem): ExpectedRosterEntry {
  return normalizeRosterEntry({
    fullName: item.fullName,
    subgroup: item.subgroup,
    region: item.region,
    group: item.group,
    source: 'attendance-prompt',
    active: true,
  })
}
