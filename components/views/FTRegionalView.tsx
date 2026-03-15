'use client'

import type { AllFTData, FTHierarchyEntry } from '@/types'
import { formatDateRange } from '@/lib/parsers'

interface Props {
  ftAllData: AllFTData
}

export function FTRegionalView({ ftAllData }: Props) {
  const { cellData, serviceData, combinedData, globalMin, globalMax } = ftAllData
  const dateRange = formatDateRange(globalMin, globalMax)
  const totalUnmatched = cellData.unmatchedRows + serviceData.unmatchedRows

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-5">
      {/* Title */}
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight">First-Timer Regional Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>📅 {dateRange}</p>
      </div>

      {/* Unmatched rows warning */}
      {totalUnmatched > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#FFF4CC', color: '#7A5A00', border: '1px solid #F6D860' }}>
          <span className="mt-0.5 flex-shrink-0">⚠️</span>
          <span>
            <strong>{totalUnmatched} row{totalUnmatched !== 1 ? 's' : ''}</strong> could not be matched to a subgroup
            ({cellData.unmatchedRows} cell, {serviceData.unmatchedRows} service) and are excluded from all tallies.
            Check that the <em>demographics</em> or <em>groups</em> columns contain a recognisable subgroup name.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Cell FTs"     value={cellData.grandTotal}     color="#1F3A5F" />
        <SummaryCard label="Service FTs"  value={serviceData.grandTotal}  color="#2E5FA3" />
        <SummaryCard label="Combined"     value={combinedData.grandTotal} color="#0D2540" />
      </div>

      {/* Cell FTs */}
      <TallySection
        title="CELL FIRST-TIMERS"
        bannerColor="#1F3A5F"
        hierarchyMap={cellData.hierarchyMap}
        grandTotal={cellData.grandTotal}
      />

      {/* Service FTs */}
      <TallySection
        title="SERVICE FIRST-TIMERS"
        bannerColor="#2E5FA3"
        hierarchyMap={serviceData.hierarchyMap}
        grandTotal={serviceData.grandTotal}
      />

      {/* Combined */}
      <TallySection
        title="COMBINED (ALL SOURCES)"
        bannerColor="#0D2540"
        hierarchyMap={combinedData.hierarchyMap}
        grandTotal={combinedData.grandTotal}
      />
    </div>
  )
}

// ─── TALLY SECTION ────────────────────────────────────────────────────────────

function TallySection({
  title, bannerColor, hierarchyMap, grandTotal,
}: {
  title: string
  bannerColor: string
  hierarchyMap: Record<string, FTHierarchyEntry>
  grandTotal: number
}) {
  const subgroups = Object.entries(hierarchyMap).sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Banner */}
      <div
        className="flex items-center justify-between px-5 py-3 text-white font-bold"
        style={{ background: bannerColor }}
      >
        <span>{title}</span>
        <span className="text-2xl">{grandTotal}</span>
      </div>

      {subgroups.length === 0 ? (
        <p className="text-sm text-slate-400 italic p-4">(No data)</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {subgroups.map(([subgroup, entry]) => (
            <SubgroupBlock key={subgroup} subgroup={subgroup} entry={entry} />
          ))}
        </div>
      )}

      {/* Grand total row */}
      <div
        className="flex items-center justify-between px-5 py-3 text-white font-bold"
        style={{ background: '#0D2540' }}
      >
        <span>GRAND TOTAL</span>
        <span className="text-xl" style={{ color: '#A8C8F0' }}>{grandTotal}</span>
      </div>
    </div>
  )
}

function SubgroupBlock({ subgroup, entry }: { subgroup: string; entry: FTHierarchyEntry }) {
  const groups = Object.entries(entry.groups).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Subgroup header */}
      <div
        className="flex items-center justify-between px-5 py-2 font-semibold text-sm"
        style={{ background: 'var(--brand-pale)', color: 'var(--brand-darkest)' }}
      >
        <span>{subgroup}</span>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: 'var(--brand-mid)', color: '#fff' }}
        >
          {entry.total}
        </span>
      </div>
      {/* Group rows */}
      {groups.map(([group, count], i) => (
        <div
          key={group}
          className="flex items-center justify-between px-6 py-1.5 text-sm"
          style={{ background: i % 2 === 0 ? '#fff' : 'var(--brand-pale)' }}
        >
          <span className="text-slate-600">{group}</span>
          <span className="font-semibold" style={{ color: 'var(--brand-dark)' }}>{count}</span>
        </div>
      ))}
      {/* Subtotal */}
      <div
        className="flex items-center justify-between px-5 py-2 font-semibold text-sm"
        style={{ background: '#CCDDF5', color: '#0D2540' }}
      >
        <span>Subtotal</span>
        <span>{entry.total}</span>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2 text-xs font-bold text-white uppercase tracking-wider" style={{ background: color }}>
        {label}
      </div>
      <div
        className="px-4 py-4 text-center"
        style={{ background: 'var(--brand-pale)' }}
      >
        <span className="text-4xl font-bold" style={{ color }}>{value}</span>
      </div>
    </div>
  )
}
