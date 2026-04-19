'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { ReportMode } from './AppShell'
import { ShieldCheck, LayoutGrid, Users, UserPlus, FileText, ChevronRight } from 'lucide-react'

interface Props {
  onSelect: (mode: ReportMode) => void
  storedGroupCount: number
}

interface CardDef {
  id: ReportMode
  badge: string
  badgeStyle: CSSProperties
  title: string
  desc: string
  uploads: { label: string; kind: 'required' | 'optional' | 'derived' }[]
  icon: ReactNode
  accentColor: string
}

const CARDS: CardDef[] = [
  {
    id: 'weekly',
    badge: 'Weekly Report',
    badgeStyle: { background: '#D0E0F4', color: '#0D2540' },
    title: 'Combined weekly overview',
    desc: 'Notes, first timers, and follow-ups consolidated into a single weekly report.',
    uploads: [
      { label: 'Elvanto Notes export', kind: 'optional' },
      { label: 'Cell FT import', kind: 'optional' },
      { label: 'Service FT import', kind: 'optional' },
    ],
    icon: <LayoutGrid size={22} />,
    accentColor: '#2A5298',
  },
  {
    id: 'attendance',
    badge: 'Meeting Attendance',
    badgeStyle: { background: '#D9F2E3', color: '#1B5E3C' },
    title: 'Roster vs actual attendance',
    desc: 'Match expected attendees against Elvanto attendance data, learn unmatched people, and save weekly snapshots.',
    uploads: [
      { label: 'Roster CSV', kind: 'required' },
      { label: 'Elvanto Attendance Export', kind: 'required' },
    ],
    icon: <Users size={22} />,
    accentColor: '#1B5E3C',
  },
  {
    id: 'ft',
    badge: 'First Timers',
    badgeStyle: { background: '#EDE8FC', color: '#3C3489' },
    title: 'First timer capture and summary',
    desc: 'Collate cell and service first timers with subgroup and group breakdowns.',
    uploads: [
      { label: 'Cell FT import', kind: 'optional' },
      { label: 'Service FT import', kind: 'optional' },
      { label: 'Group sheet', kind: 'optional' },
    ],
    icon: <UserPlus size={22} />,
    accentColor: '#5346B8',
  },
  {
    id: 'followup',
    badge: 'Follow-Up',
    badgeStyle: { background: '#FFF0D9', color: '#7A4A00' },
    title: 'Notes and follow-up activity',
    desc: 'Summarise Elvanto notes by subgroup, group, and leader with activity date range.',
    uploads: [
      { label: 'Elvanto Notes export', kind: 'required' },
    ],
    icon: <FileText size={22} />,
    accentColor: '#B06000',
  },
]

function dotStyle(kind: 'required' | 'optional' | 'derived') {
  if (kind === 'required') return { background: '#2A5298' }
  if (kind === 'derived')  return { background: '#1D9E75' }
  return { background: '#CBD5E1' }
}

function dotLabel(kind: 'required' | 'optional' | 'derived') {
  if (kind === 'required') return 'required'
  if (kind === 'derived')  return 'derived'
  return 'optional'
}

export function HomeScreen({ onSelect, storedGroupCount }: Props) {
  return (
    <div className="min-h-screen" style={{ background: '#F5F8FC' }}>
      <header className="px-6 py-5 shadow-sm" style={{ background: 'linear-gradient(135deg, #0D2540 0%, #1F3A5F 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ShieldCheck size={22} color="#DCE9F8" />
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl tracking-tight">ORS Report Suite</h1>
            <p className="text-sm mt-0.5" style={{ color: '#A8C4E0' }}>Persistent ministry reporting platform</p>
          </div>
          {storedGroupCount > 0 && (
            <div className="ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: '#A8C4E0' }}>
              ✓ {storedGroupCount} groups saved
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#2A5298' }}>Choose report type</p>
        <p className="text-sm text-slate-500 mb-6 max-w-3xl">Run a report and review ministry activity by section.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className="text-left rounded-2xl p-6 transition-all group"
              style={{ background: '#fff', border: '1px solid #D7E4F5', boxShadow: '0 1px 3px rgba(13,37,64,0.06)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = card.accentColor
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px rgba(13,37,64,0.10)`
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#D7E4F5'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(13,37,64,0.06)'
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: card.badgeStyle.background, color: card.accentColor }}>{card.icon}</div>
                <span className="mt-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={card.badgeStyle}>{card.badge}</span>
              </div>

              <h2 className="font-bold text-base mb-1.5" style={{ color: '#0D2540' }}>{card.title}</h2>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">{card.desc}</p>

              <div className="border-t pt-4" style={{ borderColor: '#E8F0FA' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#6B8EB5' }}>Uploads</p>
                <div className="space-y-1.5">
                  {card.uploads.map(u => (
                    <div key={u.label} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={dotStyle(u.kind)} />
                      <span>{u.label}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium" style={u.kind === 'derived' ? { background: '#D9F2E3', color: '#1B5E3C' } : u.kind === 'required' ? { background: '#D0E0F4', color: '#0D2540' } : { background: '#F1F5F9', color: '#64748B' }}>{dotLabel(u.kind)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: card.accentColor }}>
                Open
                <ChevronRight size={13} />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
