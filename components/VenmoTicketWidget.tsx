'use client'

import { useState } from 'react'
import { Minus, Plus, ExternalLink } from 'lucide-react'

const VENMO_USER = 'ardenjams'
const MAX_TICKETS = 10

export type TicketNameMode = 'none' | 'party' | 'all'

/**
 * Prefilled-Venmo ticket checkout: fans pick a quantity (and a name or names,
 * depending on the show's setting), then tap through to Venmo with the amount
 * and note already filled in — e.g. "2 tickets - $20: Kyle, Sam" or
 * "4 tickets - $40 — under Kyle".
 */
export default function VenmoTicketWidget({
  price,
  nameMode,
  venue,
}: {
  price: number
  nameMode: TicketNameMode
  venue: string
}) {
  const [qty, setQty] = useState(1)
  const [names, setNames] = useState('')

  const total = qty * price
  const namesMissing = nameMode !== 'none' && names.trim().length === 0

  const nameSuffix =
    names.trim().length === 0
      ? ''
      : nameMode === 'party'
        ? ` — under ${names.trim()}`
        : `: ${names.trim()}`
  const note = `${qty} ticket${qty === 1 ? '' : 's'} - $${total} (${venue})${nameSuffix}`
  const venmoUrl = `https://venmo.com/${VENMO_USER}?txn=pay&amount=${total}&note=${encodeURIComponent(note)}`

  return (
    <div className="bg-arden-black/40 border-l-2 border-arden-accent px-4 py-4">
      <p className="text-arden-accent text-xs tracking-widest uppercase mb-3">
        Tickets · ${price} each
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {/* Quantity stepper */}
        <div className="flex items-center border border-arden-border">
          <button
            type="button"
            onClick={() => setQty(q => Math.max(1, q - 1))}
            aria-label="Fewer tickets"
            className="px-3 py-2 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-arden-white font-mono text-sm">{qty}</span>
          <button
            type="button"
            onClick={() => setQty(q => Math.min(MAX_TICKETS, q + 1))}
            aria-label="More tickets"
            className="px-3 py-2 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-40"
            disabled={qty >= MAX_TICKETS}
          >
            <Plus size={14} />
          </button>
        </div>

        <span className="text-arden-white font-mono font-medium">${total}</span>

        <a
          href={namesMissing ? undefined : venmoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={namesMissing}
          onClick={e => { if (namesMissing) e.preventDefault() }}
          className={`btn-primary text-xs py-2.5 px-5 ${namesMissing ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          Pay with Venmo <ExternalLink size={12} />
        </a>
      </div>

      {nameMode !== 'none' && (
        <div className="mt-3">
          <input
            type="text"
            value={names}
            onChange={e => setNames(e.target.value)}
            placeholder={
              nameMode === 'party'
                ? 'Name for the tickets (required)'
                : qty === 1
                  ? 'Your name (required)'
                  : `${qty} names, comma separated (required)`
            }
            maxLength={200}
            className="w-full max-w-md bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent placeholder:text-arden-border"
          />
          <p className="text-arden-subtext text-xs mt-1.5">
            {nameMode === 'party'
              ? `Your ${qty === 1 ? 'ticket' : 'tickets'} will be under this name at the door.`
              : 'Names go in the Venmo note so we can check you in at the door.'}
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
