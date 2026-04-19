// ─── SUBGROUPS ────────────────────────────────────────────────────────────────

export const FOLLOW_UP_SUBGROUPS = [
  'BLW Canada Central-East SGA',
  'BLW Canada Central-East SGB',
  'BLW Canada Central SGA',
  'BLW Canada Central SGB',
  'BLW Canada West SGA',
  'BLW Canada West SGB',
] as const

export type FollowUpSubgroup = (typeof FOLLOW_UP_SUBGROUPS)[number]

export const FT_SUBGROUPS = [
  'Central East Subgroup A',
  'Central East Subgroup B',
  'Central Subgroup A',
  'Central Subgroup B',
  'West Subgroup A',
  'West Subgroup B',
] as const

export type FTSubgroup = (typeof FT_SUBGROUPS)[number]

export const SUBGROUP_CROSSWALK: Record<FollowUpSubgroup, FTSubgroup> = {
  'BLW Canada Central-East SGA': 'Central East Subgroup A',
  'BLW Canada Central-East SGB': 'Central East Subgroup B',
  'BLW Canada Central SGA':      'Central Subgroup A',
  'BLW Canada Central SGB':      'Central Subgroup B',
  'BLW Canada West SGA':         'West Subgroup A',
  'BLW Canada West SGB':         'West Subgroup B',
}

export const CATEGORY_MAP: Record<string, FollowUpSubgroup> = {
  'BLW Canada Central-East SGA': 'BLW Canada Central-East SGA',
  'BLW Canada Central-East SGB': 'BLW Canada Central-East SGB',
  'BLW Canada Central SGA':      'BLW Canada Central SGA',
  'BLW Canada Central SGB':      'BLW Canada Central SGB',
  'BLW Canada West SGA':         'BLW Canada West SGA',
  'BLW Canada West SGB':         'BLW Canada West SGB',
}

// ─── AGGREGATED STRUCTURES ────────────────────────────────────────────────────

export interface GroupInfo {
  subgroup: FollowUpSubgroup | null
  members: number
  adjustedMembers: number
}

export interface SubgroupGroupData {
  groups: string[]
  totalMembers: number
  adjustedMembers: number
}

export interface GroupDirectory {
  byName: Map<string, GroupInfo>
  bySubgroup: Map<FollowUpSubgroup, SubgroupGroupData>
}

export interface NoteAgg {
  totalNotes: number
  people: Set<string>
  groupsActive: Set<string>
  leaders: Set<string>
}

export interface NotesData {
  bySubgroup: Map<string, NoteAgg>
  byGroup:    Map<string, NoteAgg>
  byLeader:   Map<string, Map<string, { notes: number }>>
  rangeText:  string
}

// ─── FT HIERARCHY ─────────────────────────────────────────────────────────────

export interface FTHierarchyEntry {
  total: number
  groups: Record<string, number>
}

export interface FTParsedSheet {
  hierarchyMap: Record<string, FTHierarchyEntry>
  grandTotal: number
  unmatchedRows: number
  minDate: Date | null
  maxDate: Date | null
  rows: ParsedFTRow[]
}

export interface ParsedFTRow {
  fullName: string
  group: string
  subgroup: string
  fellowship: string
}

export interface FTConflictRow {
  fullName: string
  cellGroup: string
  cellSubgroup: string
  serviceGroup: string
  serviceSubgroup: string
}

export interface AllFTData {
  cellData: FTParsedSheet
  serviceData: FTParsedSheet
  combinedData: {
    hierarchyMap: Record<string, FTHierarchyEntry>
    grandTotal: number
    rows: ParsedFTRow[]
  }
  globalMin: Date | null
  globalMax: Date | null
  conflicts: FTConflictRow[]
}

// ─── HEALTH BAND ──────────────────────────────────────────────────────────────

export interface HealthBand {
  bg: string
  fg: string
}

// ─── LEADER NOTE COUNTER ──────────────────────────────────────────────────────

export interface LeaderRank {
  leader: string
  notes: number
  subgroup: string
}

// ─── SUBGROUP REPORT DATA (computed, passed to renderer) ─────────────────────

export interface SubgroupReportData {
  subgroup: FollowUpSubgroup
  ftSubgroupName: FTSubgroup | null
  notes: number
  uniquePeople: number
  totalMembers: number
  adjustedMembers: number
  groupsActive: number
  totalGroups: number
  pct: number
  leaderCount: number
  score: number
  fellowshipRows: FellowshipRow[]
  leaderRows: LeaderRow[]
  ftCellData:    FTHierarchyEntry | null
  ftServiceData: FTHierarchyEntry | null
  ftCellTotal:   number
  ftServiceTotal: number
  ftCombinedTotal: number
  rangeText: string
}

export interface FellowshipRow {
  group: string
  notes: number
  people: number
  members: number
  pct: number
  score: number
}

export interface LeaderRow {
  name: string
  notes: number
}

// ─── REGIONAL REPORT ROW ─────────────────────────────────────────────────────

export interface RegionalRow {
  subgroup: FollowUpSubgroup
  notes: number
  uniquePeople: number
  members: number
  pct: number
  groupsActive: number
  totalGroups: number
  score: number
}

