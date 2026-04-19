'use client'

interface MiniStatProps {
  label: string
  value: string | number
}

interface MiniStatPctProps {
  label: string
  value: string
  band?: { bg: string; fg: string }
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="stat-card text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-mid)' }}>
        {value}
      </p>
    </div>
  )
}

export function MiniStatPct({ label, value, band }: MiniStatPctProps) {
  return (
    <div className="stat-card text-center" style={band ? { background: band.bg } : undefined}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5"
        style={{ color: band ? band.fg : 'var(--brand-dark)' }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: band ? band.fg : 'var(--brand-mid)' }}>
        {value}
      </p>
    </div>
  )
}
