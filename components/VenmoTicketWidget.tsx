'use client'

import { useState } from 'react'
import { Minus, Plus, ExternalLink } from 'lucide-react'
import { fmtMoney, roundMoney } from '@/lib/utils'
import { buildVenmoNote, MAX_TICKETS, type TicketNameMode } from '@/lib/tickets'

const VENMO_USER = 'ardenjams'

export type { TicketNameMode }

/**
 * Prefilled-Venmo ticket checkout: fans pick a quantity (and a name or names,
 * depending on the show's setting), then tap through to Venmo with the amount
 * and note already filled in — e.g. "2 tickets - $20: Kyle, Sam" or
 * "4 tickets - $40 — under Kyle".
 *
 * 'all' mode shows one name box per ticket; boxes appear/disappear with the
 * quantity stepper.
 */
export default function VenmoTicketWidget({
  showId,
  price,
  nameMode,
  venue,
  simple = false,
}: {
  /** Firestore show id — the checkout record is filed against it */
  showId: string
  price: number
  nameMode: TicketNameMode
  venue: string
  /** Failsafe mode: just the price and a link to the band's Venmo page */
  simple?: boolean
}) {
  const [qty, setQty] = useState(1)
  const [partyName, setPartyName] = useState('')
  // Sparse name storage — the visible box count derives from qty directly
  const [names, setNames] = useState<string[]>([])

  const step = (delta: number) =>
    setQty(prev => Math.min(MAX_TICKETS, Math.max(1, prev + delta)))

  const setNameAt = (i: number, value: string) => {
    setNames(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const total = roundMoney(qty * price)
  const ticketNames = Array.from({ length: qty }, (_, i) => (names[i] || '').trim())
  const filledNames = ticketNames.filter(Boolean)
  const namesMissing =
    nameMode === 'party'
      ? partyName.trim().length === 0
      : nameMode === 'all'
        ? filledNames.length < qty
        : false

  // Names the band will need at the door: one for the whole party, or one each
  const checkoutNames = nameMode === 'party' ? [partyName.trim()].filter(Boolean) : filledNames
  const note = buildVenmoNote({ qty, total, venue, nameMode, names: checkoutNames })
  const encNote = encodeURIComponent(note)

  // The legacy venmo.com/<user>?txn=pay format dead-ends in a redirect loop.
  // App scheme opens the Venmo app straight onto the prefilled pay screen;
  // the payment-link page is Venmo's official web surface (no auth to view).
  const appUrl = `venmo://paycharge?txn=pay&recipients=${VENMO_USER}&amount=${total}&note=${encNote}`
  const webUrl = `https://account.venmo.com/payment-link?audience=private&txn=pay&recipients=${VENMO_USER}&amount=${total}&note=${encNote}`

  /**
   * Files the checkout with the band before the browser leaves for Venmo.
   *
   * keepalive lets the request outlive the navigation that fires a beat later —
   * without it the record dies with the page. Failures are swallowed on
   * purpose: a bookkeeping problem must never cost the band a sale.
   */
  const recordCheckout = () => {
    try {
      fetch('/api/tickets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, qty, names: checkoutNames }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* never block the payment */
    }
  }

  const openVenmo = (e: React.MouseEvent) => {
    e.preventDefault()
    if (namesMissing) return
    recordCheckout()
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isMobile) {
      // Try the app first; if it doesn't take over the screen within ~1.5s
      // (not installed), fall back to Venmo's web payment page
      window.location.href = appUrl
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = webUrl
        }
      }, 1500)
    } else {
      window.open(webUrl, '_blank', 'noopener')
    }
  }

  if (simple) {
    return (
      <div className="bg-arden-black/40 border-l-2 border-arden-accent px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-arden-accent text-xs tracking-widest uppercase">
            Tickets · {fmtMoney(price)} each
          </p>
          <a
            href={`https://account.venmo.com/u/${VENMO_USER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs py-2.5 px-5"
          >
            Pay @{VENMO_USER} on Venmo <ExternalLink size={12} />
          </a>
        </div>
        <details className="mt-3 hidden md:block">
          <summary className="text-xs text-arden-subtext hover:text-arden-accent cursor-pointer tracking-wider uppercase">
            Scan to pay with Venmo
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/venmo-qr.png"
            alt="Venmo QR code for @ardenjams"
            className="mt-2 w-36 h-36 bg-white p-2"
          />
        </details>
      </div>
    )
  }

  return (
    <div className="bg-arden-black/40 border-l-2 border-arden-accent px-4 py-4">
      <p className="text-arden-accent text-xs tracking-widest uppercase mb-3">
        Tickets · {fmtMoney(price)} each
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {/* Quantity stepper */}
        <div className="flex items-center border border-arden-border">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Fewer tickets"
            className="px-3 py-2 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-arden-white font-mono text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="More tickets"
            className="px-3 py-2 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-40"
            disabled={qty >= MAX_TICKETS}
          >
            <Plus size={14} />
          </button>
        </div>

        <span className="text-arden-white font-mono font-medium">{fmtMoney(total)}</span>

        <a
          href={namesMissing ? undefined : webUrl}
          rel="noopener noreferrer"
          aria-disabled={namesMissing}
          onClick={openVenmo}
          className={`btn-primary text-xs py-2.5 px-5 ${namesMissing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Pay with Venmo <ExternalLink size={12} />
        </a>
      </div>

      {nameMode === 'party' && (
        <div className="mt-3">
          <input
            type="text"
            value={partyName}
            onChange={e => setPartyName(e.target.value)}
            placeholder="Name for the tickets (required)"
            maxLength={100}
            className="w-full max-w-md bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent placeholder:text-arden-border"
          />
          <p className="text-arden-subtext text-xs mt-1.5">
            Your {qty === 1 ? 'ticket' : 'tickets'} will be under this name at the door.
          </p>
        </div>
      )}

      {nameMode === 'all' && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: qty }, (_, i) => (
            <input
              key={i}
              type="text"
              value={names[i] || ''}
              onChange={e => setNameAt(i, e.target.value)}
              placeholder={`Ticket ${i + 1} — name (required)`}
              maxLength={100}
              className="block w-full max-w-md bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent placeholder:text-arden-border"
            />
          ))}
          <p className="text-arden-subtext text-xs pt-0.5">
            Each name goes in the Venmo note so we can check everyone in at the door.
          </p>
        </div>
      )}

      <details className="mt-3 hidden md:block">
        <summary className="text-xs text-arden-subtext hover:text-arden-accent cursor-pointer tracking-wider uppercase">
          On desktop? Scan to pay
        </summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/venmo-qr.png"
          alt="Venmo QR code for @ardenjams"
          className="mt-2 w-36 h-36 bg-white p-2"
        />
        <p className="text-arden-subtext text-xs mt-1">
          @{VENMO_USER} — include &quot;{note}&quot; in the note.
        </p>
      </details>
    </div>
  )
}
