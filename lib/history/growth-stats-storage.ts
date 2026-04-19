export const GROWTH_STATS_STORAGE_KEY = 'ors_growth_stats_v1'

export type GrowthPeriodType = 'week' | 'month'

export interface GrowthStatSnapshot {
  id: string
  periodType: GrowthPeriodType
  periodLabel: string
  capturedAt: string
  notesCount: number
  firstTimersCount: number
  attendanceExpected: number
  attendancePresent: number
  attendanceAbsent: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadGrowthStatsHistory(): GrowthStatSnapshot[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(GROWTH_STATS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveGrowthStatsHistory(items: GrowthStatSnapshot[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(GROWTH_STATS_STORAGE_KEY, JSON.stringify(items))
}

export function resetGrowthStatsHistory() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(GROWTH_STATS_STORAGE_KEY)
}

function dedupeKey(item: GrowthStatSnapshot) {
  return `${item.periodType}|${item.periodLabel}`
}

export function upsertGrowthStatSnapshot(item: GrowthStatSnapshot) {
  const current = loadGrowthStatsHistory()
  const byKey = new Map<string, GrowthStatSnapshot>()
  for (const row of current) byKey.set(dedupeKey(row), row)
  byKey.set(dedupeKey(item), item)
  const next = Array.from(byKey.values()).sort((a, b) =>
    `${a.periodType}${a.periodLabel}`.localeCompare(`${b.periodType}${b.periodLabel}`),
  )
  saveGrowthStatsHistory(next)
  return next
}
