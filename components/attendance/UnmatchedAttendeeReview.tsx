'use client'

import type { UnmatchedReviewItem, UnmatchedAction } from '@/lib/attendance/unmatched-review'

interface Props {
  items: UnmatchedReviewItem[]
  onChangeAction: (id: string, action: UnmatchedAction) => void
  onAddAllValid: () => void
  onMarkAllVisitors: () => void
  onDismiss: () => void
}

export function UnmatchedAttendeeReview({ items, onChangeAction, onAddAllValid, onMarkAllVisitors, onDismiss }: Props) {
  if (!items.length) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="section-hdr">Unmatched attendee review</div>
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#FFF7ED', color: '#9A3412' }}>
          {items.length} attendee{items.length === 1 ? '' : 's'} were not found in the expected roster. Add them for future reports?
        </div>
        <button onClick={onAddAllValid} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#2A5298' }}>Add All valid unmatched attendees</button>
        <button onClick={onMarkAllVisitors} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#FFF7ED', color: '#9A3412' }}>Mark All as visitors</button>
        <button onClick={onDismiss} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: '#F1F5F9', color: '#475569' }}>Dismiss</button>
      </div>
      <table className="report-table">
        <thead><tr><th style={{ textAlign: 'left' }}>Full name</th><th>Subgroup</th><th>Region</th><th>Group</th><th>Parse issue</th><th>Action</th></tr></thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={{ textAlign: 'left' }} className="font-medium">{item.fullName}</td>
              <td>{item.subgroup || '—'}</td>
              <td>{item.region || '—'}</td>
              <td>{item.group || '—'}</td>
              <td>{item.parseIssue || '—'}</td>
              <td>
                <select value={item.action} onChange={e => onChangeAction(item.id, e.target.value as UnmatchedAction)} className="rounded border border-slate-200 px-2 py-1 text-xs">
                  <option value="pending">Pending</option>
                  <option value="add">Add to roster</option>
                  <option value="visitor">Mark as visitor</option>
                  <option value="ignore">Ignore</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
