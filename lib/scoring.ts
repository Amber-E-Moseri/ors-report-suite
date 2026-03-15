import type { HealthBand } from '@/types'

export function gradeScore(reachRatio: number, groupsActive: number, totalGroups: number): number {
  const reach = Math.max(0, Math.min(1, reachRatio || 0)) * 80
  const mob   = totalGroups > 0
    ? Math.max(0, Math.min(1, (groupsActive || 0) / totalGroups)) * 20
    : 0
  return reach + mob
}

export function gradeLabel(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round((score || 0) * 10) / 10))
  if (s >= 90) return 'A+'
  if (s >= 85) return 'A'
  if (s >= 80) return 'A−'
  if (s >= 77) return 'B+'
  if (s >= 73) return 'B'
  if (s >= 70) return 'B−'
  if (s >= 67) return 'C+'
  if (s >= 63) return 'C'
  if (s >= 60) return 'C−'
  if (s >= 57) return 'D+'
  if (s >= 53) return 'D'
  if (s >= 50) return 'D−'
  return 'F'
}

export function healthBand(score: number): HealthBand {
  if (score >= 75) return { bg: '#D9F2E3', fg: '#1B5E3C' }
  if (score >= 50) return { bg: '#FFF4CC', fg: '#7A5A00' }
  if (score >= 25) return { bg: '#FFE3CC', fg: '#8A3C00' }
  return               { bg: '#F8D7DA', fg: '#7A1C24' }
}
