export const WEEKLY_HISTORY_STORAGE_KEY = 'ors_weekly_history_v1'

export interface WeeklySnapshot {
  snapshotId: string
  weekLabel: string
  reportDate: string
  reportType: string
  region: string
  subgroup: string
  groupOrCell: string
  notesCount: number
  peopleContacted: number
  activeGroups: number
  activeLeaders: number
  firstTimersCount: number
  attendanceExpected: number
  attendancePresent: number
  attendanceAbsent: number
  visitorsCount: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadWeeklyHistory(): WeeklySnapshot[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(WEEKLY_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveWeeklyHistory(items: WeeklySnapshot[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(WEEKLY_HISTORY_STORAGE_KEY, JSON.stringify(items))
}

export function resetWeeklyHistory() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(WEEKLY_HISTORY_STORAGE_KEY)
}

function dedupeKey(item: WeeklySnapshot) {
  return [item.weekLabel, item.reportType, item.region || '-', item.subgroup || '-', item.groupOrCell || '-'].join('|')
}

export function upsertWeeklySnapshots(items: WeeklySnapshot[]) {
  const current = loadWeeklyHistory()
  const byKey = new Map<string, WeeklySnapshot>()
  for (const item of current) byKey.set(dedupeKey(item), item)
  for (const item of items) byKey.set(dedupeKey(item), item)
  const next = Array.from(byKey.values()).sort((a, b) => `${a.weekLabel}${a.reportType}`.localeCompare(`${b.weekLabel}${b.reportType}`))
  saveWeeklyHistory(next)
  return next
}

export function makeSnapshotId(item: Pick<WeeklySnapshot, 'weekLabel' | 'reportType' | 'region' | 'subgroup' | 'groupOrCell'>) {
  return `snap_${[item.weekLabel,item.reportType,item.region,item.subgroup,item.groupOrCell].join('_').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`
}
