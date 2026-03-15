'use client'

import Papa from 'papaparse'

export async function parseCSVFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (result) => {
        if (result.errors.length && !result.data.length) {
          reject(new Error(result.errors[0].message))
        } else {
          resolve(result.data)
        }
      },
      error: (err: Error) => reject(err),
    })
  })
}

export function validateGroupHeaders(rows: Record<string, unknown>[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: ['No rows found'] }
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  const missing: string[] = []
  // 'name' uses exact match — too short for substring check (would match 'full name', 'username', etc.)
  if (!headers.some(h => h === 'name')) missing.push('name')
  // 'categories' uses includes — 'category' is a common variant
  if (!headers.some(h => h.includes('categor'))) missing.push('categories')
  return { ok: missing.length === 0, missing }
}

export function validateFTHeaders(rows: Record<string, unknown>[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: ['No rows found'] }
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase())
  const required = ['full name', 'groups', 'demographics', 'date added']
  const missing = required.filter(r => !headers.some(h => h.includes(r.split(' ')[0])))
  return { ok: missing.length === 0, missing }
}

export function validateNotesHeaders(rows: Record<string, unknown>[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: ['No rows found'] }
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())

  // Accept raw Elvanto export (Created By + Person + Groups)
  // OR cleaned export (leader + group/contact name)
  const hasLeader  = headers.some(h => h === 'created by' || h.includes('leader'))
  const hasContact = headers.some(h => h === 'person'     || h.includes('contact') || h.includes('name'))
  const hasGroup   = headers.some(h => h === 'groups'     || h.includes('group'))

  const missing: string[] = []
  if (!hasLeader)  missing.push('Created By / leader')
  if (!hasContact) missing.push('Person / contact name')
  if (!hasGroup)   missing.push('Groups / group')
  return { ok: missing.length === 0, missing }
}
