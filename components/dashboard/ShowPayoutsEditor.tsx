'use client'

import { useState } from 'react'
import { Users, AlertTriangle } from 'lucide-react'
import type { ShowPayouts, Membership, PendingEdit } from '@/lib/types'
import { PendingTag } from '@/components/dashboard/PendingEditsPanel'
import { DEFAULT_BAND_SIZE } from '@/lib/tickets'
import { fmtMoney, roundMoney } from '@/lib/utils'

interface Draft {
  perMember: number
  memberCount: number
  /** undefined = nobody marked yet; never presumed from the roster */
  paidUids?: string[]
}

/**
 * Splits one show's net between the members and the shared fund.
 *
 * The member count is entered rather than counted from the dashboard roster:
 * logging in and playing the show are different things, and a lineup that
 * changes later must not silently rewrite what an old night paid out. The
 * roster renders as toggles so the split names exactly who was paid — having a
 * dashboard login never implies inclusion. The count follows the selection but
 * can be raised past it for subs or guests without accounts, and any
 * disagreement is surfaced instead of reconciled behind the scenes.
 */
export default function ShowPayoutsEditor({
  payouts,
  netRevenue,
  roster,
  isAdmin,
  busy,
  pending,
  onChange,
}: {
  payouts?: ShowPayouts
  /** Gross less expenses — the pot being divided */
  netRevenue: number
  /** Active dashboard members, when the viewer is allowed to see them */
  roster?: Membership[]
  isAdmin: boolean
  busy?: boolean
  /** Set when this section is waiting on someone to sign it off */
  pending?: PendingEdit
  onChange: (next: ShowPayouts) => void
}) {
  const [draft, setDraft] = useState<Draft>({
    perMember: payouts?.perMember ?? 0,
    memberCount: payouts?.memberCount ?? DEFAULT_BAND_SIZE,
    paidUids: payouts?.paidUids,
  })

  // Re-sync when the show reloads underneath us, during render not in an effect
  const [synced, setSynced] = useState(payouts)
  if (payouts !== synced) {
    setSynced(payouts)
    setDraft({
      perMember: payouts?.perMember ?? 0,
      memberCount: payouts?.memberCount ?? DEFAULT_BAND_SIZE,
      paidUids: payouts?.paidUids,
    })
  }

  const perMember = roundMoney(draft.perMember || 0)
  const memberCount = Math.max(0, Math.floor(draft.memberCount || 0))
  const totalPaid = roundMoney(perMember * memberCount)
  const bandFund = roundMoney(netRevenue - totalPaid)
  const overdrawn = totalPaid > netRevenue

  const buildNext = (d: Draft): ShowPayouts => {
    const pm = roundMoney(d.perMember || 0)
    const mc = Math.max(0, Math.floor(d.memberCount || 0))
    return {
      perMember: pm,
      memberCount: mc,
      totalPaid: roundMoney(pm * mc),
      bandFund: roundMoney(netRevenue - roundMoney(pm * mc)),
      // Firestore rejects undefined — the field only exists once someone is marked
      ...(d.paidUids ? { paidUids: d.paidUids } : {}),
    }
  }

  const changed = (next: ShowPayouts) =>
    next.perMember !== payouts?.perMember ||
    next.memberCount !== payouts?.memberCount ||
    next.totalPaid !== payouts?.totalPaid ||
    next.bandFund !== payouts?.bandFund ||
    JSON.stringify(next.paidUids ?? null) !== JSON.stringify(payouts?.paidUids ?? null)

  const commit = () => {
    const next = buildNext(draft)
    if (changed(next)) onChange(next)
  }

  /** Chip toggle saves immediately — there is no blur moment to commit on */
  const togglePaid = (uid: string) => {
    const current = draft.paidUids ?? []
    const removing = current.includes(uid)
    const nextUids = removing ? current.filter(u => u !== uid) : [...current, uid]
    // Count follows the selection, direction-aware. Naming another payee fills
    // an unnamed (guest) share before growing the total; unmarking someone
    // means one fewer person was paid, never a new phantom guest. The very
    // first selection starts the count fresh from that person alone.
    const memberCount =
      draft.paidUids === undefined
        ? nextUids.length
        : removing
          ? Math.max(nextUids.length, draft.memberCount - 1)
          : Math.max(draft.memberCount, nextUids.length)
    const nextDraft: Draft = { ...draft, paidUids: nextUids, memberCount }
    setDraft(nextDraft)
    const next = buildNext(nextDraft)
    if (changed(next)) onChange(next)
  }

  const active = (roster || []).filter(m => m.active)
  const marked = draft.paidUids !== undefined

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
        <Users size={14} /> Payouts
        <PendingTag edit={pending} />
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
              Who got paid
            </p>
            <ul className="flex flex-wrap gap-2">
              {active.map(m => {
                const isPaid = (draft.paidUids ?? []).includes(m.uid)
                const name = m.displayName || m.email
                return (
                  <li key={m.uid}>
                    <button
                      type="button"
                      disabled={!isAdmin || busy}
                      onClick={() => togglePaid(m.uid)}
                      aria-pressed={isPaid}
                      className={`px-3 py-1.5 text-sm border transition-colors disabled:cursor-default ${
                        isPaid
                          ? 'border-arden-accent text-arden-accent bg-arden-accent/10'
                          : 'border-arden-border text-arden-subtext hover:border-arden-muted'
                      }`}
                    >
                      {name}
                      {isPaid && perMember > 0 && (
                        <span className="font-mono"> · {fmtMoney(perMember)}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            {!marked ? (
              <p className="text-arden-subtext text-xs mt-2 leading-relaxed">
                {isAdmin
                  ? 'Nobody is marked as paid yet — tap the members who took part in this split. Being on the dashboard doesn’t put anyone in it.'
                  : 'Nobody has been marked as paid for this show yet.'}
              </p>
            ) : (
              (() => {
                const selected = (draft.paidUids ?? []).length
                const diff = memberCount - selected
                if (diff > 0) {
                  return (
                    <p className="text-arden-subtext text-xs mt-2 leading-relaxed">
                      {selected} marked here, but the split counts {memberCount} ways — the extra{' '}
                      {diff === 1 ? 'share covers a sub or guest' : `${diff} shares cover subs or guests`}{' '}
                      without dashboard accounts.
                    </p>
                  )
                }
                if (diff < 0) {
                  return (
                    <p className="text-red-400 text-xs mt-2 leading-relaxed">
                      {selected} members are marked paid but the split only counts {memberCount} —
                      raise the count or unmark someone.
                    </p>
                  )
                }
                return null
              })()
            )}
          </div>
        )}
      </div>
    </div>
  )
}
