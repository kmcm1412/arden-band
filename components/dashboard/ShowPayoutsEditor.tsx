'use client'

import { useState } from 'react'
import { Users, AlertTriangle } from 'lucide-react'
import type { ShowPayouts, Membership } from '@/lib/types'
import { DEFAULT_BAND_SIZE } from '@/lib/tickets'
import { fmtMoney, roundMoney } from '@/lib/utils'

interface Draft {
  perMember: number
  memberCount: number
}

/**
 * Splits one show's net between the members and the shared fund.
 *
 * The member count is entered rather than counted from the dashboard roster:
 * logging in and playing the show are different things, and a lineup that
 * changes later must not silently rewrite what an old night paid out. The
 * roster is shown alongside as a reference, and any disagreement with the count
 * is surfaced instead of reconciled behind the scenes.
 */
export default function ShowPayoutsEditor({
  payouts,
  netRevenue,
  roster,
  isAdmin,
  busy,
  onChange,
}: {
  payouts?: ShowPayouts
  /** Gross less expenses — the pot being divided */
  netRevenue: number
  /** Active dashboard members, when the viewer is allowed to see them */
  roster?: Membership[]
  isAdmin: boolean
  busy?: boolean
  onChange: (next: ShowPayouts) => void
}) {
  const [draft, setDraft] = useState<Draft>({
    perMember: payouts?.perMember ?? 0,
    memberCount: payouts?.memberCount ?? DEFAULT_BAND_SIZE,
  })

  // Re-sync when the show reloads underneath us, during render not in an effect
  const [synced, setSynced] = useState(payouts)
  if (payouts !== synced) {
    setSynced(payouts)
    setDraft({
      perMember: payouts?.perMember ?? 0,
      memberCount: payouts?.memberCount ?? DEFAULT_BAND_SIZE,
    })
  }

  const perMember = roundMoney(draft.perMember || 0)
  const memberCount = Math.max(0, Math.floor(draft.memberCount || 0))
  const totalPaid = roundMoney(perMember * memberCount)
  const bandFund = roundMoney(netRevenue - totalPaid)
  const overdrawn = totalPaid > netRevenue

  const commit = () => {
    const next: ShowPayouts = { perMember, memberCount, totalPaid, bandFund }
    if (
      next.perMember !== payouts?.perMember ||
      next.memberCount !== payouts?.memberCount ||
      next.totalPaid !== payouts?.totalPaid ||
      next.bandFund !== payouts?.bandFund
    ) {
      onChange(next)
    }
  }

  const active = (roster || []).filter(m => m.active)

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
        <Users size={14} /> Payouts
      </h2>

      <div className="bg-arden-surface border border-arden-border p-5">
        <p className="text-arden-subtext text-xs mb-4 leading-relaxed">
          What each member took home. Whatever is left of the night&apos;s net stays in the
          band fund for shared costs.
        </p>

        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label
              htmlFor="per-member"
              className="text-xs tracking-widest uppercase text-arden-subtext block mb-1"
            >
              Each member ($)
            </label>
            <input
              id="per-member"
              type="number"
              min="0"
              step="0.01"
              value={draft.perMember || ''}
              disabled={!isAdmin || busy}
              onChange={e => setDraft(d => ({ ...d, perMember: parseFloat(e.target.value) || 0 }))}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="0"
              className="w-32 bg-arden-dark border border-arden-border text-arden-accent font-mono px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
            />
          </div>
          <span className="text-arden-border pb-2.5 text-sm">×</span>
          <div>
            <label
              htmlFor="member-count"
              className="text-xs tracking-widest uppercase text-arden-subtext block mb-1"
            >
              Members
            </label>
            <input
              id="member-count"
              type="number"
              min="0"
              step="1"
              value={draft.memberCount || ''}
              disabled={!isAdmin || busy}
              onChange={e => setDraft(d => ({ ...d, memberCount: parseInt(e.target.value) || 0 }))}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder={String(DEFAULT_BAND_SIZE)}
              className="w-24 bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
            />
          </div>
          <div className="pb-1">
            <p className="text-xs tracking-widest uppercase text-arden-subtext mb-1">Paid out</p>
            <p className="text-arden-white font-display font-bold text-xl leading-none">
              {fmtMoney(totalPaid)}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-arden-border grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-arden-subtext text-[10px] tracking-widest uppercase mb-1">Net revenue</p>
            <p className="text-arden-text font-mono text-sm">{fmtMoney(netRevenue)}</p>
          </div>
          <div>
            <p className="text-arden-subtext text-[10px] tracking-widest uppercase mb-1">
              Member payouts
            </p>
            <p className="text-arden-text font-mono text-sm">−{fmtMoney(totalPaid)}</p>
          </div>
          <div>
            <p className="text-arden-subtext text-[10px] tracking-widest uppercase mb-1">Band fund</p>
            <p
              className={`font-mono text-sm ${overdrawn ? 'text-red-400' : 'text-arden-accent'}`}
            >
              {fmtMoney(bandFund)}
            </p>
          </div>
        </div>

        {overdrawn && (
          <p className="flex items-start gap-2 text-red-400 text-xs mt-3 leading-relaxed">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>
              Payouts exceed the night&apos;s net by {fmtMoney(totalPaid - netRevenue)} — the fund
              covers the difference.
            </span>
          </p>
        )}

        {active.length > 0 && (
          <div className="mt-4 pt-4 border-t border-arden-border">
            <p className="text-arden-subtext text-[10px] tracking-widest uppercase mb-2">
              Dashboard members
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {active.map(m => (
                <li key={m.uid} className="text-arden-text text-sm">
                  {m.displayName || m.email}
                  {perMember > 0 && (
                    <span className="text-arden-subtext"> · {fmtMoney(perMember)}</span>
                  )}
                </li>
              ))}
            </ul>
            {memberCount !== active.length && (
              <p className="text-arden-subtext text-xs mt-2 leading-relaxed">
                This show splits {memberCount} way{memberCount === 1 ? '' : 's'} but {active.length}{' '}
                member{active.length === 1 ? ' is' : 's are'} on the dashboard — the split above is
                what counts.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
