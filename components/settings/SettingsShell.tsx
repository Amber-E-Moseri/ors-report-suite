'use client'

import { useCallback, useState } from 'react'
import { Settings, FolderOpen, Users } from 'lucide-react'
import { GroupsView } from '../views/GroupsView'
import { RosterView } from './RosterView'
import type { StoredGroup } from '@/lib/group-store'

interface Props {
  storedGroups: StoredGroup[]
  onGroupsChange: (groups: StoredGroup[]) => void
  onBack: () => void
}

type SettingsTab = 'groups' | 'roster'

export function SettingsShell({ storedGroups, onGroupsChange, onBack }: Props) {
  const [tab, setTab] = useState<SettingsTab>('groups')

  const handleClearGroups = useCallback(() => {
    onGroupsChange([])
  }, [onGroupsChange])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #0D2540 0%, #2A5298 100%)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Settings size={20} color="#DCE9F8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-white font-bold text-xl tracking-tight">ORS Report Suite</h1>
                <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(184,212,255,0.22)', color: '#B8D4FF', background: 'rgba(255,255,255,0.05)' }}>
                  Settings
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: '#DCE9F8' }}>Manage group directory and attendance roster sources.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.10)', color: '#DCE9F8' }}>
              ? Back to Suite Home
            </button>
          </div>
        </div>
      </header>

      <div data-tab-bar style={{ background: 'var(--brand-darkest)', borderBottom: '2px solid var(--brand-dark)' }}>
        <div className="flex items-end gap-1 px-6 pt-3 overflow-x-auto">
          <button
            onClick={() => setTab('groups')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              background: tab === 'groups' ? '#F5F8FC' : 'transparent',
              color: tab === 'groups' ? 'var(--brand-darkest)' : '#90AACC',
              borderBottom: tab === 'groups' ? '2px solid var(--brand-dark)' : 'none',
              marginBottom: tab === 'groups' ? '-2px' : '0',
            }}
          >
            <FolderOpen size={14} />Group Directory
          </button>
          <button
            onClick={() => setTab('roster')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              background: tab === 'roster' ? '#F5F8FC' : 'transparent',
              color: tab === 'roster' ? 'var(--brand-darkest)' : '#90AACC',
              borderBottom: tab === 'roster' ? '2px solid var(--brand-dark)' : 'none',
              marginBottom: tab === 'roster' ? '-2px' : '0',
            }}
          >
            <Users size={14} />Attendance Roster
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        {tab === 'groups' ? (
          <GroupsView groups={storedGroups} onChange={onGroupsChange} onClearAll={handleClearGroups} />
        ) : (
          <RosterView />
        )}
      </main>
    </div>
  )
}