'use client'

import { useState } from 'react'
import { DoorOpen } from 'lucide-react'
import type { DoorSales } from '@/lib/types'
import { fmtMoney, roundMoney } from '@/lib/utils'

const EMPTY: DoorSales = { count: 0, amount: 0 }

/**
 * Walk-ups paid at the door, logged after the show.
 *
 * Two numbers and nothing else: there are no names to check in, and the door
 * price is often not the presale price, so a count alone could not be turned
 * into a total. Saves on blur rather than behind a save button, matching the
 * expenses list.
 */
export default function DoorSalesInput({
  doorSales,
  isAdmin,
  busy,
  onChange,
}: {
  doorSales?: DoorSales
  isAdmin: boolean
  busy?: boolean
  onChange: (next: DoorSales) => void
}) {
  const saved = doorSales || EMPTY
  const [draft, setDraft] = useState<DoorSales>(saved)

  // Re-sync when the show reloads underneath us, adjusting state during render
  // rather than through an effect
  const [synced, setSynced] = useState(doorSales)
  if (doorSales !== synced) {
    setSynced(doorSales)
    setDraft(doorSales || EMPTY)
  }

  const commit = () => {
    const next = { count: Math.max(0, Math.floor(draft.count || 0)), amount: roundMoney(draft.amount || 0) }
    if (next.count !== saved.count || next.amount !== saved.amount) onChange(next)
  }

  const perHead = draft.count > 0 ? roundMoney((draft.amount || 0) / draft.count) : 0

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
        <DoorOpen size={14} /> Door Sales
      </h2>
      <div className="bg-arden-surface border border-arden-border p-5">
        <p className="text-arden-subtext text-xs mb-4 leading-relaxed">
          Walk-ups paid on the night. These count toward the totals but not the guest
          list — nobody bought them ahead of time.
        </p>
        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label
              htmlFor="door-count"
              className="text-xs tracking-widest uppercase text-arden-subtext block mb-1"
            >
              Tickets
            </label>
            <input
              id="door-count"
              type="number"
              min="0"
              step="1"
              value={draft.count || ''}
              disabled={!isAdmin || busy}
              onChange={e => setDraft(d => ({ ...d, count: parseInt(e.target.value) || 0 }))}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="0"
              className="w-28 bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="door-amount"
              className="text-xs tracking-widest uppercase text-arden-subtext block mb-1"
            >
              Collected ($)
            </label>
            <input
              id="door-amount"
              type="number"
              min="0"
              step="0.01"
              value={draft.amount || ''}
              disabled={!isAdmin || busy}
              onChange={e => setDraft(d => ({ ...d, amount: parseFloat(e.target.value) || 0 }))}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="0"
              className="w-32 bg-arden-dark border border-arden-border text-arden-accent font-mono px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
            />
          </div>
          {draft.count > 0 && draft.amount > 0 && (
            <p className="text-arden-subtext text-xs pb-2.5">
              {fmtMoney(perHead)} a head
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
