'use client'

import type { ReactNode } from 'react'
import { CalendarRange, Printer, RotateCcw, Users } from 'lucide-react'
import { pctText } from '@/lib/parsers'
import { healthBand } from '@/lib/scoring'
import type { MeetingReport } from './types'

interface Props {
  report: MeetingReport
  onReset: () => void
  onBack: () => void
}

export function MeetingReportPanel({ report, onReset, onBack }: Props) {
  const reachBand = healthBand(report.reachPct * 100)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 shadow-sm" style={{ background: 'var(--gradient-header)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Users size={20} color="#DCE9F8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-white font-bold text-xl tracking-tight">ORS Report Suite</h1>
                <span className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(184,212,255,0.22)', color: '#B8D4FF', background: 'rgba(255,255,255,0.05)' }}>
                  Meeting Report
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: '#F8FBFF' }}>
                  <CalendarRange size={13} />
                  {report.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 report-actions">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors" style={{ background: 'var(--brand-dark)', color: '#fff' }}>
              <Printer size={12} />Print / PDF
            </button>
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors" style={{ background: 'rgba(255,255,255,0.10)', color: '#DCE9F8' }}>
              {'<- Back to Suite Home'}
            </button>
            <button onClick={onReset} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors" style={{ background: 'var(--brand-dark)', color: '#fff' }}>
              <RotateCcw size={12} />New Upload
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="fade-in max-w-5xl mx-auto space-y-5">
          <Section title="SUMMARY">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <StatCard label="Expected" value={report.expectedCount} />
              <StatCard label="Attended" value={report.attendedCount} />
              <StatCard label="Absent" value={report.absentCount} />
              <StatCard label="Unexpected" value={report.unexpectedCount} />
            </div>
            <div className="rounded-xl px-5 py-4 text-center" style={{ background: reachBand.bg }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: reachBand.fg }}>Reach %</p>
              <p className="text-4xl font-bold mt-1" style={{ color: reachBand.fg }}>{pctText(report.reachPct)}</p>
            </div>
          </Section>

          <NameSection
            title={`PRESENT (${report.present.length})`}
            names={report.present}
            headerBg="#166534"
            headerFg="#FFFFFF"
            chipBg="#DCFCE7"
            chipFg="#166534"
            emptyText="No matching names found."
          />

          <NameSection
            title={`ABSENT (${report.absent.length})`}
            names={report.absent}
            headerBg="#991B1B"
            headerFg="#FFFFFF"
            chipBg="#FEE2E2"
            chipFg="#991B1B"
            emptyText="No absences."
          />

          {report.unexpected.length > 0 && (
            <NameSection
              title={`UNEXPECTED ATTENDEES (${report.unexpected.length})`}
              names={report.unexpected}
              headerBg="#92400E"
              headerFg="#FFFFFF"
              chipBg="#FEF3C7"
              chipFg="#92400E"
            />
          )}
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr m-0 rounded-none px-4 py-2.5">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-mid)' }}>{value}</p>
    </div>
  )
}

function NameSection({
  title,
  names,
  headerBg,
  headerFg,
  chipBg,
  chipFg,
  emptyText = 'No names.',
}: {
  title: string
  names: string[]
  headerBg: string
  headerFg: string
  chipBg: string
  chipFg: string
  emptyText?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="section-hdr m-0 rounded-none px-4 py-2.5" style={{ background: headerBg, color: headerFg }}>
        {title}
      </div>
      <div className="p-4">
        {names.length === 0 ? (
          <p className="text-sm text-slate-400 italic">{emptyText}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {names.map((name) => (
              <span key={name} className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: chipBg, color: chipFg }}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
