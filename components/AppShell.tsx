'use client'

import { useState, useCallback, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { HomeScreen } from './HomeScreen'
import { WeeklyShell } from './weekly/WeeklyShell'
import { FTShell } from './fts/FTShell'
import { FollowUpShell } from './followup/FollowUpShell'
import { AttendanceShell } from './attendance/AttendanceShell'
import { MeetingShell } from './meeting/MeetingShell'
import { SettingsShell } from './settings/SettingsShell'
import {
  loadStoredGroups,
  saveStoredGroups,
  type StoredGroup,
} from '@/lib/group-store'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { clearFTSession, clearFUSession } from '@/lib/report-session-storage'

export type ReportMode = 'weekly' | 'ft' | 'followup' | 'attendance' | 'meeting' | 'settings'

const REPORT_TABS: { id: ReportMode; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'ft', label: 'First Timers' },
  { id: 'followup', label: 'Follow Up' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'meeting', label: 'Meeting Report' },
  { id: 'settings', label: 'Settings' },
]

export function AppShell() {
  const [mode, setMode] = useState<ReportMode | null>(null)
  const [storedGroups, setStoredGroups] = useState<StoredGroup[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    void (async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) setAuthError(error.message)
      setUser(data.user ?? null)
      setAuthLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setGroupsLoaded(false)
      return
    }
    let cancelled = false
    void (async () => {
      const groups = await loadStoredGroups()
      if (cancelled) return
      setStoredGroups(groups)
      setGroupsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleGroupsChange = useCallback(
    (groups: StoredGroup[]) => {
      setStoredGroups(groups)
      if (user && groupsLoaded) {
        void saveStoredGroups(groups)
      }
    },
    [user, groupsLoaded],
  )

  const handleBack = useCallback(() => setMode(null), [])

  const handleGoogleSignIn = useCallback(async () => {
    setAuthError('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setAuthError(error.message)
  }, [])

  const handleSignOut = useCallback(async () => {
    clearFTSession()
    clearFUSession()
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setMode(null)
    setStoredGroups([])
    setGroupsLoaded(false)
  }, [])

  const renderContent = () => {
    if (!mode) {
      return <HomeScreen onSelect={setMode} storedGroupCount={storedGroups.length} />
    }

    if (mode === 'weekly') {
      return (
        <WeeklyShell
          storedGroups={storedGroups}
          onGroupsChange={handleGroupsChange}
          onBack={handleBack}
        />
      )
    }

    if (mode === 'ft') {
      return (
        <FTShell
          storedGroups={storedGroups}
          onGroupsChange={handleGroupsChange}
          onBack={handleBack}
        />
      )
    }

    if (mode === 'followup') {
      return (
        <FollowUpShell
          storedGroups={storedGroups}
          onGroupsChange={handleGroupsChange}
          onBack={handleBack}
        />
      )
    }

    if (mode === 'attendance') {
      return <AttendanceShell onBack={handleBack} />
    }

    if (mode === 'meeting') {
      return <MeetingShell onBack={handleBack} />
    }

    if (mode === 'settings') {
      return (
        <SettingsShell
          storedGroups={storedGroups}
          onGroupsChange={handleGroupsChange}
          onBack={handleBack}
        />
      )
    }

    return null
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full border-4 mx-auto mb-3 spin"
            style={{ borderColor: '#2A5298', borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-slate-500">Checking sign-in...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F8FC' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h1 className="text-xl font-bold" style={{ color: '#0D2540' }}>
            Sign in to ORS Report Suite
          </h1>
          <p className="text-sm text-slate-600">
            Use your Google account to load saved Groups data in Supabase.
          </p>
          <button
            onClick={() => {
              void handleGoogleSignIn()
            }}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2A5298' }}
          >
            Continue with Google
          </button>
          {authError ? <p className="text-xs text-red-600">{authError}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <button
            onClick={handleBack}
            className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            style={
              !mode
                ? { background: '#2A5298', color: '#fff' }
                : { background: '#E2E8F0', color: '#0F172A' }
            }
          >
            Home
          </button>
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={
                mode === tab.id
                  ? { background: '#2A5298', color: '#fff' }
                  : { background: '#F1F5F9', color: '#334155' }
              }
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-600">{user.email}</span>
          <button
            onClick={() => {
              void handleSignOut()
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: '#E2E8F0', color: '#0F172A' }}
          >
            Sign out
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  )
}
