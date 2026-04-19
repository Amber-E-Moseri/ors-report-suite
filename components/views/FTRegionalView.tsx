'use client'

import { useMemo, useState } from 'react'
import { Fragment } from 'react'
import type { AllFTData } from '@/types'
import { FT_SUBGROUPS } from '@/types'
import { formatDateRange } from '@/lib/parsers'

interface Props {
  ftAllData: AllFTData
}

interface RegionalRow {
  key: string
  subgroup: string
  cell: number
  service: number
  total: number
  groupTotals: Array<{ group: string; cell: number; service: number; total: number }>
}

export function FTRegionalView({ ftAllData }: Props) {
  const { cellData, serviceData, globalMin, globalMax } = ftAllData
  const dateRange = formatDateRange(globalMin, globalMax)
  const [expandedSubgroup, setExpandedSubgroup] = useState<string | null>(null)

  const rows = useMemo<RegionalRow[]>(() => {
    const canonicalRows: RegionalRow[] = FT_SUBGROUPS.map((subgroup) => {
      const cellEntry = cellData.hierarchyMap[subgroup]
      const serviceEntry = serviceData.hierarchyMap[subgroup]
      const groupNames = new Set([
        ...Object.keys(cellEntry?.groups ?? {}),
        ...Object.keys(serviceEntry?.groups ?? {}),
      ])
      const groupTotals = Array.from(groupNames)
        .map((group) => {
          const cell = cellEntry?.groups[group] ?? 0
          const service = serviceEntry?.groups[group] ?? 0
          return { group, cell, service, total: cell + service }
        })
        .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group))

      return {
        key: subgroup,
        subgroup,
        cell: cellEntry?.total ?? 0,
        service: serviceEntry?.total ?? 0,
        total: (cellEntry?.total ?? 0) + (serviceEntry?.total ?? 0),
        groupTotals,
      }
    })

    const extraKeys = new Set([
      ...Object.keys(cellData.hierarchyMap),
      ...Object.keys(serviceData.hierarchyMap),
    ])
    for (const subgroup of FT_SUBGROUPS) {
      extraKeys.delete(subgroup)
    }

    if (extraKeys.size > 0) {
      const groupAccumulator = new Map<string, { cell: number; service: number }>()
      let cell = 0
      let service = 0

      for (const subgroup of extraKeys) {
        const cellEntry = cellData.hierarchyMap[subgroup]
        const serviceEntry = serviceData.hierarchyMap[subgroup]
        cell += cellEntry?.total ?? 0
        service += serviceEntry?.total ?? 0

        for (const [group, count] of Object.entries(cellEntry?.groups ?? {})) {
          const current = groupAccumulator.get(group) ?? { cell: 0, service: 0 }
          current.cell += count
          groupAccumulator.set(group, current)
        }
        for (const [group, count] of Object.entries(serviceEntry?.groups ?? {})) {
          const current = groupAccumulator.get(group) ?? { cell: 0, service: 0 }
          current.service += count
          groupAccumulator.set(group, current)
        }
      }

      const groupTotals = Array.from(groupAccumulator.entries())
        .map(([group, counts]) => ({
          group,
          cell: counts.cell,
          service: counts.service,
          total: counts.cell + counts.service,
        }))
        .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group))

      canonicalRows.push({
        key: '__other__',
        subgroup: 'Other',
        cell,
        service,
        total: cell + service,
        groupTotals,
      })
    }

    return canonicalRows
  }, [cellData.hierarchyMap, serviceData.hierarchyMap])

  const totals = rows.reduce(
    (acc, row) => ({
      cell: acc.cell + row.cell,
      service: acc.service + row.service,
      total: acc.total + row.total,
    }),
    { cell: 0, service: 0, total: 0 },
  )

  const totalUnmatched = cellData.unmatchedRows + serviceData.unmatchedRows

  return (
    <div className="fade-in max-w-5xl mx-auto space-y-5">
      <div className="rounded-xl px-6 py-5 text-white" style={{ background: 'var(--brand-darkest)' }}>
        <h1 className="text-xl font-bold tracking-tight">First-Timer Regional Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--brand-period)' }}>
          {dateRange}
        </p>
      </div>

      {totalUnmatched > 0 && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#FFF4CC', color: '#7A5A00', border: '1px solid #F6D860' }}
        >
          <span>
            <strong>
              {totalUnmatched} row{totalUnmatched !== 1 ? 's' : ''}
            </strong>{' '}
            could not be matched to a subgroup ({cellData.unmatchedRows} cell, {serviceData.unmatchedRows} service).
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Cell FT" value={totals.cell} />
        <SummaryCard label="Service FT" value={totals.service} />
        <SummaryCard label="Total FT" value={totals.total} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="report-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Subgroup</th>
              <th>Cell</th>
              <th>Service</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedSubgroup === row.key
              return (
                <Fragment key={row.key}>
                  <tr
                    onClick={() => setExpandedSubgroup((prev) => (prev === row.key ? null : row.key))}
                    className="cursor-pointer"
                  >
                    <td className="font-semibold" style={{ color: 'var(--brand-darkest)' }}>
                      {isExpanded ? '▼' : '▶'} {row.subgroup}
                    </td>
                    <td>{row.cell}</td>
                    <td>{row.service}</td>
                    <td className="font-bold">{row.total}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <div className="px-4 py-3" style={{ background: '#F8FBFF' }}>
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left' }}>Group</th>
                                <th>Cell</th>
                                <th>Service</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.groupTotals.map((group) => (
                                <tr key={`${row.key}-${group.group}`}>
                                  <td className="font-medium" style={{ color: 'var(--brand-darkest)' }}>
                                    {group.group}
                                  </td>
                                  <td>{group.cell}</td>
                                  <td>{group.service}</td>
                                  <td className="font-bold">{group.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>GRAND TOTAL</td>
              <td>{totals.cell}</td>
              <td>{totals.service}</td>
              <td>{totals.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card rounded-xl text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--brand-dark)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--brand-mid)' }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
