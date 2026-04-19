import type { AllFTData, NotesData } from '@/types'

const FT_KEY = 'ors_ft_session'
const FU_KEY = 'ors_fu_session'

const mapTag = '__map__'
const setTag = '__set__'

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return [mapTag, Array.from(value.entries())]
  }
  if (value instanceof Set) {
    return [setTag, Array.from(value.values())]
  }
  return value
}

function reviveDate(key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    (key === 'globalMin' || key === 'globalMax' || key === 'minDate' || key === 'maxDate')
  ) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return value
}

function reviver(key: string, value: unknown): unknown {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] === mapTag &&
    Array.isArray(value[1])
  ) {
    return new Map(value[1] as Array<[string, unknown]>)
  }
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] === setTag &&
    Array.isArray(value[1])
  ) {
    return new Set(value[1] as Array<unknown>)
  }
  return reviveDate(key, value)
}

export function saveFTSession(ftAllData: AllFTData): void {
  try {
    sessionStorage.setItem(FT_KEY, JSON.stringify(ftAllData))
  } catch {}
}

export function loadFTSession(): AllFTData | null {
  try {
    const raw = sessionStorage.getItem(FT_KEY)
    if (!raw) return null
    return JSON.parse(raw, reviver) as AllFTData
  } catch {
    return null
  }
}

export function clearFTSession(): void {
  try {
    sessionStorage.removeItem(FT_KEY)
  } catch {}
}

export function saveFUSession(notesData: NotesData): void {
  try {
    sessionStorage.setItem(FU_KEY, JSON.stringify(notesData, replacer))
  } catch {}
}

export function loadFUSession(): NotesData | null {
  try {
    const raw = sessionStorage.getItem(FU_KEY)
    if (!raw) return null
    return JSON.parse(raw, reviver) as NotesData
  } catch {
    return null
  }
}

export function clearFUSession(): void {
  try {
    sessionStorage.removeItem(FU_KEY)
  } catch {}
}
