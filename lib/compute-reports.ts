import type {
  GroupDirectory, NotesData, AllFTData,
  SubgroupReportData, RegionalRow,
  LeaderRank, FellowshipRow, LeaderRow,
  FollowUpSubgroup,
} from '@/types'
import { FOLLOW_UP_SUBGROUPS, SUBGROUP_CROSSWALK } from '@/types'
import { safeRatio } from './parsers'
import { gradeScore, gradeLabel } from './scoring'

// ─── SUBGROUP REPORT ─────────────────────────────────────────────────────────

export function computeSubgroupReport(
  subgroup: FollowUpSubgroup,
  groupDir: GroupDirectory,
  notesData: NotesData,
  ftAllData: AllFTData | null,
): SubgroupReportData {
  const ftSubgroupName = SUBGROUP_CROSSWALK[subgroup] ?? null
  const { bySubgroup, byGroup, byLeader, rangeText } = notesData
  const { bySubgroup: grpBySub, byName } = groupDir

  const st  = bySubgroup.get(subgroup) ?? { totalNotes: 0, people: new Set(), groupsActive: new Set(), leaders: new Set() }
  const gd  = grpBySub.get(subgroup)   ?? { groups: [], totalMembers: 0, adjustedMembers: 0 }

  const notes          = st.totalNotes
  const uniquePeople   = st.people.size
  const totalMembers   = gd.totalMembers
  const adjustedMembers = gd.adjustedMembers
  const groupsActive   = st.groupsActive.size
  const totalGroups    = gd.groups.length
  const pct            = safeRatio(uniquePeople, adjustedMembers)
  const leaderCount    = st.leaders?.size ?? 0
  const score          = gradeScore(pct, groupsActive, totalGroups)

  // Fellowship rows
  const allowedGroups = new Set(gd.groups)
  const fellowshipRows: FellowshipRow[] = []
  byGroup.forEach((v, g) => {
    if (!allowedGroups.has(g)) return
    const info = byName.get(g)
    const mem  = info?.members ?? 0
    const adjM = info?.adjustedMembers ?? 0
    const n    = v.totalNotes
    const u    = v.people.size
    const p    = safeRatio(u, adjM)
    fellowshipRows.push({ group: g, notes: n, people: u, members: mem, pct: p, score: p * 100 })
  })
  fellowshipRows.sort((a, b) => a.group.localeCompare(b.group))

  // Leader rows
  const subLeaderMap = byLeader.get(subgroup) ?? new Map()
  const leaderRows: LeaderRow[] = []
  subLeaderMap.forEach((v, name) => leaderRows.push({ name, notes: v.notes }))
  leaderRows.sort((a, b) => b.notes - a.notes || a.name.localeCompare(b.name))

  // FT data
  let ftCellData    = null, ftServiceData = null
  let ftCellTotal   = 0, ftServiceTotal = 0, ftCombinedTotal = 0
  if (ftAllData && ftSubgroupName) {
    ftCellData    = ftAllData.cellData.hierarchyMap[ftSubgroupName]    ?? null
    ftServiceData = ftAllData.serviceData.hierarchyMap[ftSubgroupName] ?? null
    ftCellTotal   = (ftAllData.cellData.rows.filter(r => r.subgroup === ftSubgroupName)).length
    ftServiceTotal = (ftAllData.serviceData.rows.filter(r => r.subgroup === ftSubgroupName)).length
    ftCombinedTotal = ftCellTotal + ftServiceTotal
  }

  return {
    subgroup, ftSubgroupName,
    notes, uniquePeople, totalMembers, adjustedMembers,
    groupsActive, totalGroups, pct, leaderCount,
    score, fellowshipRows, leaderRows,
    ftCellData, ftServiceData, ftCellTotal, ftServiceTotal, ftCombinedTotal,
    rangeText,
  }
}

// ─── REGIONAL REPORT ─────────────────────────────────────────────────────────

export function computeRegionalRows(
  groupDir: GroupDirectory,
  notesData: NotesData,
): RegionalRow[] {
  return FOLLOW_UP_SUBGROUPS.map(subgroup => {
    const st  = notesData.bySubgroup.get(subgroup) ?? { totalNotes: 0, people: new Set(), groupsActive: new Set(), leaders: new Set() }
    const gd  = groupDir.bySubgroup.get(subgroup)  ?? { groups: [], totalMembers: 0, adjustedMembers: 0 }
    const pct = safeRatio(st.people.size, gd.adjustedMembers)
    return {
      subgroup,
      notes:        st.totalNotes,
      uniquePeople: st.people.size,
      members:      gd.totalMembers,
      pct,
      groupsActive: st.groupsActive.size,
      totalGroups:  gd.groups.length,
      score:        gradeScore(pct, st.groupsActive.size, gd.groups.length),
    }
  })
}

// ─── LEADER NOTE COUNTER ─────────────────────────────────────────────────────

export function computeLeaderRanks(
  notesData: NotesData,
): LeaderRank[] {
  const ranked: LeaderRank[] = []

  notesData.byLeader.forEach((leaderMap, subgroup) => {
    leaderMap.forEach((v, leader) => {
      const existing = ranked.find(r => r.leader === leader)
      if (existing) {
        existing.notes += v.notes
        // Merge subgroup labels, keeping (Unassigned) only if no real subgroup found
        if (subgroup !== '(Unassigned)' && !existing.subgroup.includes(subgroup)) {
          existing.subgroup = existing.subgroup === '(Unassigned)'
            ? subgroup
            : existing.subgroup + ' / ' + subgroup
        }
      } else {
        ranked.push({ leader, notes: v.notes, subgroup })
      }
    })
  })

  return ranked.sort((a, b) => b.notes - a.notes || a.leader.localeCompare(b.leader))
}
