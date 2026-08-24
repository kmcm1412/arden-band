import type { PendingEdit, PendingEditField, FinanceApproval } from '@/lib/types'

/**
 * Fallback trusted list, used when siteContent/financeApproval has not been
 * written yet. The Firestore doc is authoritative — this only keeps behaviour
 * sane before it exists, and matches what the band asked for on day one.
 */
export const DEFAULT_TRUSTED_EMAILS = ['kmcmahon1412@gmail.com', 'tjred26@gmail.com']

export const DEFAULT_FINANCE_APPROVAL: FinanceApproval = {
  trustedEmails: DEFAULT_TRUSTED_EMAILS,
  enabled: true,
}

/** Human labels for the areas an edit can touch */
export const FIELD_LABELS: Record<PendingEditField, string> = {
  doorSales: 'Door sales',
  expenses: 'Expenses',
  payouts: 'Payouts',
  ticketSales: 'Ticket sales',
  stats: 'Show numbers',
}

/**
 * Whether this person's financial edits apply without a second signature.
 *
 * Missing config falls back to the defaults rather than trusting everyone,
 * because the failure that matters is edits silently skipping review.
 */
export function isTrustedEditor(
  email: string | null | undefined,
  config?: FinanceApproval | null
): boolean {
  const settings = config ?? DEFAULT_FINANCE_APPROVAL
  if (!settings.enabled) return true
  const who = (email || '').trim().toLowerCase()
  if (!who) return false
  return (settings.trustedEmails || []).some(e => e.trim().toLowerCase() === who)
}

/**
 * Files a pending edit against a field.
 *
 * If that field already has one open, the earlier `previous` is carried over
 * rather than replaced. Two edits in a row would otherwise leave the snapshot
 * pointing at the first edit's result, and rejecting would "restore" a value
 * nobody ever approved.
 */
export function withPendingEdit(current: PendingEdit[], entry: PendingEdit): PendingEdit[] {
  const existing = current.find(e => e.field === entry.field)
  const merged: PendingEdit = existing
    ? { ...entry, id: existing.id, previous: existing.previous, previousSummary: existing.previousSummary }
    : entry
  return [...current.filter(e => e.field !== entry.field), merged]
}

/**
 * Drops any open edit for a field. Used when a trusted member edits the same
 * area — their word settles it — and after a confirm or reject resolves one.
 */
export function clearPendingFor(current: PendingEdit[], field: PendingEditField): PendingEdit[] {
  return current.filter(e => e.field !== field)
}

export function pendingFor(
  current: PendingEdit[] | undefined,
  field: PendingEditField
): PendingEdit | undefined {
  return (current || []).find(e => e.field === field)
}

/** A short, readable description of a value, for the review panel */
export function describeValue(field: PendingEditField, value: unknown): string {
  const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`)

  if (value == null) return 'not set'

  switch (field) {
    case 'doorSales': {
      const v = value as { count?: number; amount?: number }
      if (!v.count && !v.amount) return 'not set'
      return `${v.count || 0} ticket${v.count === 1 ? '' : 's'} for ${money(v.amount || 0)}`
    }
    case 'expenses': {
      const v = value as { label: string; amount: number }[]
      if (!Array.isArray(v) || v.length === 0) return 'nothing deducted'
      const total = v.reduce((n, e) => n + (e.amount || 0), 0)
      return `${v.length} item${v.length === 1 ? '' : 's'} totalling ${money(total)}`
    }
    case 'payouts': {
      const v = value as { perMember?: number; memberCount?: number; totalPaid?: number }
      if (!v.perMember && !v.memberCount) return 'no split recorded'
      return `${money(v.perMember || 0)} x ${v.memberCount || 0} = ${money(v.totalPaid || 0)}`
    }
    case 'ticketSales': {
      const v = value as { qty?: number; amount?: number }[]
      if (!Array.isArray(v) || v.length === 0) return 'no sales'
      const qty = v.reduce((n, s) => n + (s.qty || 0), 0)
      const amt = v.reduce((n, s) => n + (s.amount || 0), 0)
      return `${v.length} sale${v.length === 1 ? '' : 's'} · ${qty} ticket${qty === 1 ? '' : 's'} · ${money(amt)}`
    }
    case 'stats': {
      const v = value as Record<string, unknown>
      const parts: string[] = []
      if (v.attendance != null) parts.push(`${v.attendance} in`)
      if (v.payout != null) parts.push(`${money(Number(v.payout))} payout`)
      if (v.costs != null) parts.push(`${money(Number(v.costs))} costs`)
      if (v.merchSales != null) parts.push(`${money(Number(v.merchSales))} merch`)
      return parts.length ? parts.join(' · ') : 'nothing logged'
    }
    default:
      return 'changed'
  }
}
