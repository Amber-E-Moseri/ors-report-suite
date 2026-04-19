import type { HealthBand } from '@/types'

export type ScoreStatus = 'Excellent' | 'Good' | 'Needs Attention' | 'Critical'

export interface ScoreStatusBand extends HealthBand {
  label: ScoreStatus
}

interface WeightedScoreInput {
  reachRatio: number
  mobilizationRatio: number
  reachWeight?: number
  mobilizationWeight?: number
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normalizeWeight(value: number): number {
  return clamp(value, 0, 1)
}

export function ratio(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0
  return clamp(num / den, 0, 1)
}

export function percentageScore(ratioValue: number, maxPoints = 100): number {
  return clamp(ratioValue, 0, 1) * Math.max(0, maxPoints)
}

export function mobilizationRatio(groupsActive: number, totalGroups: number): number {
  return ratio(groupsActive, totalGroups)
}

export function mobilizationScore(groupsActive: number, totalGroups: number, maxPoints = 100): number {
  return percentageScore(mobilizationRatio(groupsActive, totalGroups), maxPoints)
}

export function weightedScore(input: WeightedScoreInput): number {
  const reachWeight = normalizeWeight(input.reachWeight ?? 0.8)
  const mobilizationWeight = normalizeWeight(input.mobilizationWeight ?? 0.2)
  const totalWeight = reachWeight + mobilizationWeight
  if (totalWeight <= 0) return 0

  const weightedRatio = (
    (clamp(input.reachRatio, 0, 1) * reachWeight) +
    (clamp(input.mobilizationRatio, 0, 1) * mobilizationWeight)
  ) / totalWeight

  return percentageScore(weightedRatio, 100)
}

export function scoreToGradeLabel(score: number): string {
  const s = clamp(Math.round((score || 0) * 10) / 10, 0, 100)
  if (s >= 90) return 'A+'
  if (s >= 85) return 'A'
  if (s >= 80) return 'A-'
  if (s >= 77) return 'B+'
  if (s >= 73) return 'B'
  if (s >= 70) return 'B-'
  if (s >= 67) return 'C+'
  if (s >= 63) return 'C'
  if (s >= 60) return 'C-'
  if (s >= 57) return 'D+'
  if (s >= 53) return 'D'
  if (s >= 50) return 'D-'
  return 'F'
}

export function scoreToStatusBand(score: number): ScoreStatusBand {
  if (score >= 85) return { label: 'Excellent', bg: '#D9F2E3', fg: '#1B5E3C' }
  if (score >= 70) return { label: 'Good', bg: '#E4EEF9', fg: '#1B3E6B' }
  if (score >= 50) return { label: 'Needs Attention', bg: '#FFF4CC', fg: '#7A5A00' }
  return { label: 'Critical', bg: '#F8D7DA', fg: '#7A1C24' }
}

// Backward-compatible helper used by existing weekly/follow-up views.
export function gradeScore(reachRatio: number, groupsActive: number, totalGroups: number): number {
  return weightedScore({
    reachRatio,
    mobilizationRatio: mobilizationRatio(groupsActive, totalGroups),
    reachWeight: 0.8,
    mobilizationWeight: 0.2,
  })
}

export function gradeLabel(score: number): string {
  return scoreToGradeLabel(score)
}

export function healthBand(score: number): HealthBand {
  const statusBand = scoreToStatusBand(score)
  return { bg: statusBand.bg, fg: statusBand.fg }
}