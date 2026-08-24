'use client'

import { useState } from 'react'
import { Plus, Trash2, Receipt } from 'lucide-react'
import type { ShowExpense, PendingEdit } from '@/lib/types'
import { PendingTag } from '@/components/dashboard/PendingEditsPanel'
import { fmtMoney, roundMoney } from '@/lib/utils'

/** The deductions that come up on almost every show */
const PRESETS = ['Door', 'Sound', 'Venue'] as const

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}

/**
 * Itemized deductions for one show — a list of labelled dollar amounts that
 * come off ticket revenue, nothing more.
 *
 * Saves without a save button, but not on every keystroke: typing edits a local
 * draft and the write goes out on blur or Enter. Adding and removing a row
 * persist immediately, since those are single deliberate actions.
 */
export default function ShowExpenses({
  expenses,
  isAdmin,
  busy,
  pending,
  onChange,
}: {
  expenses: ShowExpense[]
  isAdmin: boolean
  busy?: boolean
  /** Set when this section is waiting on someone to sign it off */
  pending?: PendingEdit
  onChange: (next: ShowExpense[]) => void
}) {
  const [rows, setRows] = useState<ShowExpense[]>(expenses)

  // Re-sync when the show reloads underneath us. Adjusting state during render
  // rather than in an effect: React re-runs this component before touching the
  // DOM, so there is no cascading render, and no window where the rows on
  // screen disagree with the show that was just loaded.
  const [synced, setSynced] = useState(expenses)
  if (expenses !== synced) {
    setSynced(expenses)
    setRows(expenses)
  }

  const total = roundMoney(rows.reduce((n, r) => n + (r.amount || 0), 0))

  const commit = (next: ShowExpense[]) => {
    setRows(next)
    onChange(next)
  }

  const addRow = (label: string) =>
    commit([...rows, { id: genId(), label, amount: 0 }])

  const removeRow = (id: string) => commit(rows.filter(r => r.id !== id))

  const editLocal = (id: string, patch: Partial<ShowExpense>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))

  /** Push the local draft to Firestore, but only if it actually differs */
  const commitEdits = () => {
    const changed =
      rows.length !== expenses.length ||
      rows.some((r, i) => r.label !== expenses[i]?.label || r.amount !== expenses[i]?.amount)
    if (changed) onChange(rows.map(r => ({ ...r, amount: roundMoney(r.amount || 0) })))
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
          <Receipt size={14} /> Expenses
          <PendingTag edit={pending} />
        </h2>
        {total > 0 && (
          <span className="text-arden-white font-mono text-sm">−{fmtMoney(total)}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-arden-subtext text-sm py-5 text-center border border-dashed border-arden-border">
          Nothing deducted yet{isAdmin ? ' — add what came off the top.' : '.'}
        </p>
      ) : (
        <div className="space-y-px">
          {rows.map(row => (
            <div
              key={row.id}
              className="flex items-center gap-3 p-2.5 bg-arden-surface border border-arden-border"
            >
              <input
                type="text"
                value={row.label}
                disabled={!isAdmin || busy}
                onChange={e => editLocal(row.id, { label: e.target.value })}
                onBlur={commitEdits}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="What for?"
                maxLength={60}
                aria-label="Expense label"
                className="flex-1 min-w-0 bg-transparent text-arden-white text-sm px-2 py-1.5 border border-transparent focus:outline-none focus:border-arden-accent focus:bg-arden-dark disabled:opacity-60 placeholder:text-arden-border"
              />
              <div className="flex items-center flex-shrink-0">
                <span className="text-arden-subtext text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount || ''}
                  disabled={!isAdmin || busy}
                  onChange={e => editLocal(row.id, { amount: parseFloat(e.target.value) || 0 })}
                  onBlur={commitEdits}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  placeholder="0"
                  aria-label={`Amount for ${row.label || 'expense'}`}
                  className="w-24 bg-transparent text-arden-accent font-mono text-sm px-1 py-1.5 border border-transparent focus:outline-none focus:border-arden-accent focus:bg-arden-dark disabled:opacity-60 text-right"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={busy}
                  title={`Remove ${row.label || 'expense'}`}
                  aria-label={`Remove ${row.label || 'expense'}`}
                  className="text-arden-subtext hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-arden-subtext text-[10px] tracking-widest uppercase mr-1">Add</span>
          {PRESETS.map(label => (
            <button
              key={label}
              onClick={() => addRow(label)}
              disabled={busy}
              className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
            >
              <Plus size={11} /> {label}
            </button>
          ))}
          <button
            onClick={() => addRow('')}
            disabled={busy}
            className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-40"
          >
            <Plus size={11} /> Other
          </button>
        </div>
      )}
    </div>
  )
}
