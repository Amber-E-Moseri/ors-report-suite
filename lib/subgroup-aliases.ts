import type { FTSubgroup, FollowUpSubgroup } from '@/types'
import { FT_SUBGROUPS, FOLLOW_UP_SUBGROUPS } from '@/types'

export const SUBGROUP_CROSSWALK: Record<FollowUpSubgroup, FTSubgroup> = {
  'BLW Canada Central-East SGA': 'Central East Subgroup A',
  'BLW Canada Central-East SGB': 'Central East Subgroup B',
  'BLW Canada Central SGA': 'Central Subgroup A',
  'BLW Canada Central SGB': 'Central Subgroup B',
  'BLW Canada West SGA': 'West Subgroup A',
  'BLW Canada West SGB': 'West Subgroup B',
}

export const FT_TO_FOLLOWUP_CROSSWALK: Record<FTSubgroup, FollowUpSubgroup> = {
  'Central East Subgroup A': 'BLW Canada Central-East SGA',
  'Central East Subgroup B': 'BLW Canada Central-East SGB',
  'Central Subgroup A': 'BLW Canada Central SGA',
  'Central Subgroup B': 'BLW Canada Central SGB',
  'West Subgroup A': 'BLW Canada West SGA',
  'West Subgroup B': 'BLW Canada West SGB',
}

// Kept as lowercased aliases for existing FT parsers that use string includes checks.
export const FT_SUBGROUP_ALIASES: Record<string, FTSubgroup> = {
  'central east subgroup a': 'Central East Subgroup A',
  'central east sga': 'Central East Subgroup A',
  'blw canada central-east sga': 'Central East Subgroup A',
  'blw canada central east sga': 'Central East Subgroup A',
  'canada central-east sga': 'Central East Subgroup A',
  'canada central east sga': 'Central East Subgroup A',
  'central-east sga': 'Central East Subgroup A',
  'zz | central-east sga': 'Central East Subgroup A',

  'central east subgroup b': 'Central East Subgroup B',
  'central east sgb': 'Central East Subgroup B',
  'blw canada central-east sgb': 'Central East Subgroup B',
  'blw canada central east sgb': 'Central East Subgroup B',
  'canada central-east sgb': 'Central East Subgroup B',
  'canada central east sgb': 'Central East Subgroup B',
  'central-east sgb': 'Central East Subgroup B',
  'zz | central-east sgb': 'Central East Subgroup B',

  'central subgroup a': 'Central Subgroup A',
  'central sga': 'Central Subgroup A',
  'blw canada central sga': 'Central Subgroup A',
  'canada central sga': 'Central Subgroup A',
  'zz | central sga': 'Central Subgroup A',

  'central subgroup b': 'Central Subgroup B',
  'central sgb': 'Central Subgroup B',
  'blw canada central sgb': 'Central Subgroup B',
  'canada central sgb': 'Central Subgroup B',
  'zz | central sgb': 'Central Subgroup B',

  'west subgroup a': 'West Subgroup A',
  'west sga': 'West Subgroup A',
  'blw canada west sga': 'West Subgroup A',
  'canada west sga': 'West Subgroup A',
  'zz | west sga': 'West Subgroup A',

  'west subgroup b': 'West Subgroup B',
  'west sgb': 'West Subgroup B',
  'blw canada west sgb': 'West Subgroup B',
  'canada west sgb': 'West Subgroup B',
  'zz | west sgb': 'West Subgroup B',
}

function subgroupKey(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[_|]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const FT_BY_KEY = new Map<string, FTSubgroup>()
const FOLLOWUP_BY_KEY = new Map<string, FollowUpSubgroup>()

for (const subgroup of FT_SUBGROUPS) {
  FT_BY_KEY.set(subgroupKey(subgroup), subgroup)
}
for (const subgroup of FOLLOW_UP_SUBGROUPS) {
  FOLLOWUP_BY_KEY.set(subgroupKey(subgroup), subgroup)
  FT_BY_KEY.set(subgroupKey(subgroup), SUBGROUP_CROSSWALK[subgroup])
}
for (const [alias, canonical] of Object.entries(FT_SUBGROUP_ALIASES)) {
  FT_BY_KEY.set(subgroupKey(alias), canonical)
}
for (const [followup, ft] of Object.entries(SUBGROUP_CROSSWALK)) {
  FT_BY_KEY.set(subgroupKey(followup), ft)
  FOLLOWUP_BY_KEY.set(subgroupKey(ft), followup as FollowUpSubgroup)
}

export function normalizeFTSubgroup(input: string | null | undefined): FTSubgroup | null {
  const key = subgroupKey(input || '')
  if (!key) return null
  return FT_BY_KEY.get(key) ?? null
}

export function normalizeFollowUpSubgroup(input: string | null | undefined): FollowUpSubgroup | null {
  const key = subgroupKey(input || '')
  if (!key) return null

  const direct = FOLLOWUP_BY_KEY.get(key)
  if (direct) return direct

  const ft = FT_BY_KEY.get(key)
  if (!ft) return null
  return FT_TO_FOLLOWUP_CROSSWALK[ft] ?? null
}

export function toFTSubgroup(input: string | null | undefined): FTSubgroup | null {
  return normalizeFTSubgroup(input)
}

export function toFollowUpSubgroup(input: string | null | undefined): FollowUpSubgroup | null {
  return normalizeFollowUpSubgroup(input)
}

export function subgroupRegion(input: string | null | undefined): 'West' | 'Central East' | 'Central' | '' {
  const normalized = normalizeFTSubgroup(input) ?? ''
  if (normalized.startsWith('West')) return 'West'
  if (normalized.startsWith('Central East')) return 'Central East'
  if (normalized.startsWith('Central')) return 'Central'
  return ''
}