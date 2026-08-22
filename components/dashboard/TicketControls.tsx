'use client'

import { useState, useMemo } from 'react'
import { ListChecks, Copy, Download, Check, AlertTriangle } from 'lucide-react'
import type { TicketSale, TicketOrder } from '@/lib/types'
import {
  buildGuestList,
  formatGuestList,
  guestListFilename,
  type GuestSort,
} from '@/lib/tickets'

/**
 * Public ticket sales switch for one show.
 *
 * Presentational only — the page owns persistence, so a failed write can leave
 * the switch showing what Firestore actually holds rather than what was clicked.
 */
export function TicketSalesToggle({
  enabled,
  busy,
  disabled,
  onChange,
}: {
  enabled: boolean
  busy?: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-arden-surface border border-arden-border p-4">
      <div className="min-w-0">
        <p className="text-arden-white text-sm font-medium">Public ticket sales</p>
        <p className="text-arden-subtext text-xs mt-0.5 leading-relaxed">
          {enabled
            ? 'Fans can buy tickets for this show on the site.'
            : 'Ticket buying is hidden on the site — the show still appears, marked unavailable.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Public ticket sales"
        disabled={busy || disabled}
        onClick={() => onChange(!enabled)}
        className={`relative flex-shrink-0 w-12 h-6 border transition-colors disabled:opacity-40 ${
          enabled ? 'bg-arden-accent/20 border-arden-accent' : 'bg-arden-dark border-arden-border'
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-4 w-4 transition-all duration-200 motion-reduce:transition-none ${
            enabled ? 'left-[26px] bg-arden-accent' : 'left-0.5 bg-arden-border'
          }`}
        />
      </button>
    </div>
  )
}

/**
 * Door list export.
 *
 * Defaults to the confirmed ledger, because a tap on "Pay with Venmo" is not
 * proof of payment. But a list that silently omits paid fans is its own failure
 * at the door, so pending checkouts can be folded in on request — counted,
 * marked with an asterisk, and explained in the printed footer.
 */
export function GuestListExport({
  venue,
  datetime,
  sales,
  pendingOrders = [],
}: {
  venue: string
  datetime?: string
  sales: TicketSale[]
  /** Checkouts nobody has matched to a Venmo payment yet */
  pendingOrders?: TicketOrder[]
}) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<GuestSort>('first')
  const [includePending, setIncludePending] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  const pendingCount = pendingOrders.length
  const pendingTickets = pendingOrders.reduce((n, o) => n + (o.qty || 0), 0)

  const { entries, text, filename } = useMemo(() => {
    const list = buildGuestList(sales, sort, includePending ? pendingOrders : [])
    return {
      entries: list,
      text: formatGuestList({
        venue,
        datetime,
        entries: list,
        purchases: sales.length + (includePending ? pendingCount : 0),
      }),
      filename: guestListFilename(venue, datetime),
    }
  }, [sales, sort, venue, datetime, includePending, pendingOrders, pendingCount])

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard api')
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      // Older mobile browsers and any non-secure context land here
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(ok ? 'ok' : 'fail')
      } catch {
        setCopied('fail')
      }
    }
    setTimeout(() => setCopied(null), 2500)
  }

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (sales.length === 0 && pendingCount === 0) return null

  return (
    <div className="mb-6">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost text-xs py-1.5 px-4">
        <ListChecks size={12} /> {open ? 'Hide' : 'Export'} Guest List
      </button>

      {open && (
        <div className="bg-arden-surface border border-arden-border p-4 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-arden-white text-sm">
              {entries.length} {entries.length === 1 ? 'guest' : 'guests'}
              <span className="text-arden-subtext">
                {' '}
                from {sales.length} {sales.length === 1 ? 'purchase' : 'purchases'}
              </span>
            </p>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-arden-subtext tracking-widest uppercase text-[10px] mr-1">Sort</span>
              {(['first', 'last'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  aria-pressed={sort === mode}
                  className={`px-2.5 py-1 border tracking-wider uppercase text-[10px] transition-colors ${
                    sort === mode
                      ? 'border-arden-accent text-arden-accent'
                      : 'border-arden-border text-arden-subtext hover:text-arden-white'
                  }`}
                >
                  {mode} name
                </button>
              ))}
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="border border-yellow-700/50 bg-yellow-900/10 p-3 mb-3">
              <p className="flex items-start gap-2 text-yellow-500 text-xs leading-relaxed">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>
                  {pendingCount} unconfirmed checkout{pendingCount === 1 ? '' : 's'} ({pendingTickets}{' '}
                  ticket{pendingTickets === 1 ? '' : 's'}) {pendingCount === 1 ? 'has' : 'have'} not been
                  matched to a Venmo payment. Confirming them above is the reliable fix — including them
                  here is a door-night shortcut, and they are marked with * on the list.
                </span>
              </p>
              <label className="flex items-center gap-2 mt-2.5 text-xs text-arden-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePending}
                  onChange={e => setIncludePending(e.target.checked)}
                  className="accent-arden-accent"
                />
                Include unconfirmed checkouts
              </label>
            </div>
          )}

          <pre className="bg-arden-dark border border-arden-border p-3 text-xs text-arden-text font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre select-all">
            {text}
          </pre>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button onClick={copy} className="btn-primary text-xs py-2 px-5">
              {copied === 'ok' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Copy failed' : 'Copy'}
            </button>
            <button onClick={download} className="btn-ghost text-xs py-2 px-5">
              <Download size={12} /> Download .txt
            </button>
            {copied === 'fail' && (
              <span className="text-arden-subtext text-xs">
                Select the list above and copy manually.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
