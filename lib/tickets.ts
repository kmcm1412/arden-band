import { fmtMoney, roundMoney } from '@/lib/utils'

export type TicketNameMode = 'none' | 'party' | 'all'

/** Hard ceiling on tickets per checkout, enforced on both the widget and the API */
export const MAX_TICKETS = 10

/**
 * The text that goes in the Venmo payment note.
 *
 * The widget builds it for the payment URL and the checkout API rebuilds it for
 * the stored order — they share this function so the recorded note is
 * character-for-character what the band sees in their Venmo feed, which is what
 * makes reconciling an order against a real payment possible.
 */
export function buildVenmoNote({
  qty,
  total,
  venue,
  nameMode,
  names,
}: {
  qty: number
  total: number
  venue: string
  nameMode: TicketNameMode
  /** For 'party', the single will-call name; for 'all', one per ticket */
  names: string[]
}): string {
  const filled = names.map(n => (n || '').trim()).filter(Boolean)
  const suffix =
    nameMode === 'party' && filled[0]
      ? ` — under ${filled[0]}`
      : nameMode === 'all' && filled.length > 0
        ? `: ${filled.join(', ')}`
        : ''
  return `${qty} ticket${qty === 1 ? '' : 's'} - ${fmtMoney(total)} (${venue})${suffix}`
}

/** Resolves the effective name mode, honoring the deprecated boolean */
export function resolveNameMode(show: {
  ticketNameMode?: TicketNameMode | null
  ticketNamesRequired?: boolean | null
}): TicketNameMode {
  return show.ticketNameMode || (show.ticketNamesRequired ? 'all' : 'none')
}

export interface ParsedVenmoRow {
  name: string
  qty: number
  amount: number
  note?: string
  /** The original pasted line, shown in the review table */
  raw: string
}

export interface ParsedVenmoPaste {
  rows: ParsedVenmoRow[]
  /** Lines that could not be read — surfaced so nothing is silently dropped */
  skipped: string[]
}

// "2 tickets - $20 (The Delancey): Kyle, Sam" / "4 tickets - $40 (X) — under Kyle"
//
// The name captures allow commas, since an 'all'-mode note separates
// ticketholders with them. A quote or pipe still ends the capture, which is
// what keeps a note embedded in a CSV row from swallowing the columns after it.
const NOTE_RE =
  /(\d+)\s*tickets?\s*[-–—]\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\(([^)]*)\))?\s*(?:(?:[-–—]\s*under\s+([^"|;]+))|(?::\s*([^"|;]+)))?/i

/**
 * Reads pasted Venmo history into reviewable ticket sales.
 *
 * Backfill path for checkouts made before orders were recorded: the widget's
 * note format is deterministic, so a payment note pasted out of the Venmo feed
 * (or a whole CSV row containing one) still yields the quantity, amount, and
 * names. Two shapes are accepted per line:
 *
 *   1. anything containing a widget note — "2 tickets - $20 (The Delancey): Kyle, Sam"
 *   2. a plain "Name, qty, amount" row — "Kyle McMahon, 2, 20"
 *
 * Nothing here is guessed: a line that fails to yield both a quantity and an
 * amount goes to `skipped` rather than being invented into a sale.
 */
export function parseVenmoPaste(text: string): ParsedVenmoPaste {
  const rows: ParsedVenmoRow[] = []
  const skipped: string[] = []

  // Split on newlines; trim() also strips the carriage return of CRLF pastes
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const noteMatch = line.match(NOTE_RE)
    if (noteMatch) {
      const qty = parseInt(noteMatch[1], 10)
      const amount = parseFloat(noteMatch[2].replace(/,/g, ''))
      const partyName = (noteMatch[4] || '').trim()
      const listNames = (noteMatch[5] || '')
        .split(',')
        .map(n => n.trim())
        .filter(Boolean)
      const name = partyName || listNames.join(', ')
      if (qty > 0 && Number.isFinite(amount)) {
        rows.push({
          name: name || 'Venmo checkout (no name in note)',
          qty,
          amount: roundMoney(amount),
          note: noteMatch[3] ? `Venue in note: ${noteMatch[3].trim()}` : undefined,
          raw: line,
        })
        continue
      }
    }

    const parts = line.split(',').map(p => p.trim())
    if (parts.length >= 3) {
      const qty = parseInt(parts[parts.length - 2], 10)
      const amount = parseFloat(parts[parts.length - 1].replace(/[$,]/g, ''))
      const name = parts.slice(0, parts.length - 2).join(', ').trim()
      if (name && qty > 0 && Number.isFinite(amount) && amount >= 0) {
        rows.push({ name, qty, amount: roundMoney(amount), raw: line })
        continue
      }
    }

    skipped.push(line)
  }

  return { rows, skipped }
}
