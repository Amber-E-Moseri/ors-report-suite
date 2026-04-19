export interface MeetingSession {
  label: string
  expected: string[]
  attended: string[]
}

export interface MeetingReport {
  label: string
  expectedCount: number
  attendedCount: number
  absentCount: number
  unexpectedCount: number
  reachPct: number
  present: string[]
  absent: string[]
  unexpected: string[]
}
