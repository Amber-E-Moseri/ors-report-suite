import type { WeeklySnapshot } from './snapshot-storage'

export type DashboardMetric =
  | 'notesCount'
  | 'peopleContacted'
  | 'activeGroups'
  | 'activeLeaders'
  | 'firstTimersCount'
  | 'attendanceExpected'
  | 'attendancePresent'
  | 'attendanceAbsent'
  | 'visitorsCount'

export type DashboardView = 'overall' | 'regional' | 'subgroup' | 'cell/group'

function isOverallRow(item: WeeklySnapshot) {
  return !item.region && !item.subgroup && !item.groupOrCell
}

function isRegionalRow(item: WeeklySnapshot) {
  return Boolean(item.region) && !item.subgroup && !item.groupOrCell
}

function isSubgroupRow(item: WeeklySnapshot) {
  return Boolean(item.subgroup) && !item.groupOrCell
}

function isCellOrGroupRow(item: WeeklySnapshot) {
  return Boolean(item.groupOrCell)
}

export function filterSnapshots(
  items: WeeklySnapshot[],
  filters: {
    reportType?: string
    region?: string
    subgroup?: string
    groupOrCell?: string
    weekFrom?: string
    weekTo?: string
  },
) {
  return items.filter(item => {
    if (filters.reportType && filters.reportType !== 'all' && item.reportType !== filters.reportType) return false
    if (filters.region && filters.region !== 'all' && item.region !== filters.region) return false
    if (filters.subgroup && filters.subgroup !== 'all' && item.subgroup !== filters.subgroup) return false
    if (filters.groupOrCell && filters.groupOrCell !== 'all' && item.groupOrCell !== filters.groupOrCell) return false
    if (filters.weekFrom && item.weekLabel < filters.weekFrom) return false
    if (filters.weekTo && item.weekLabel > filters.weekTo) return false
    return true
  })
}

export function aggregateByView(items: WeeklySnapshot[], view: DashboardView, metric: DashboardMetric) {
  const grouped = new Map<string, WeeklySnapshot[]>()
  for (const item of items) {
    if (view === 'overall' && !isOverallRow(item)) continue
    if (view === 'regional' && !isRegionalRow(item)) continue
    if (view === 'subgroup' && !isSubgroupRow(item)) continue
    if (view === 'cell/group' && !isCellOrGroupRow(item)) continue

    const key =
      view === 'overall'
        ? 'Overall'
        : view === 'regional'
          ? (item.region || 'Unassigned')
          : view === 'subgroup'
            ? (item.subgroup || 'Unassigned')
            : (item.groupOrCell || 'Unassigned')

    const arr = grouped.get(key) || []
    arr.push(item)
    grouped.set(key, arr)
  }

  return Array.from(grouped.entries()).map(([label, rows]) => {
    const weekMap = new Map<string, number>()
    for (const row of rows) {
      const week = row.weekLabel
      weekMap.set(week, (weekMap.get(week) || 0) + Number(row[metric] || 0))
    }

    const ordered = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekLabel, value]) => ({ weekLabel, value }))

    const current = ordered[ordered.length - 1]
    const previous = ordered[ordered.length - 2]
    const currentValue = Number(current?.value || 0)
    const previousValue = Number(previous?.value || 0)
    const rolling = ordered.slice(-4)
    return {
      label,
      currentWeek: current?.weekLabel || '',
      previousWeek: previous?.weekLabel || '',
      currentValue,
      previousValue,
      difference: currentValue - previousValue,
      rollingAverage: rolling.length ? rolling.reduce((sum, item) => sum + Number(item.value || 0), 0) / rolling.length : 0,
      rows: ordered.map(item => ({ weekLabel: item.weekLabel, value: Number(item.value || 0), snapshot: null })),
    }
  }).sort((a, b) => b.currentValue - a.currentValue)
}
