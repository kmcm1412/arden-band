import { fmtMoney, roundMoney, formatDateTime, toEasternIso } from '@/lib/utils'
import type { TicketSale, ShowExpense, DoorSales } from '@/lib/types'

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

// ─── Guest list ─────────────────────────────────────────────────────────────

export type GuestSort = 'first' | 'last'

export interface GuestListEntry {
  /** Name as it should be read at the door */
  name: string
  /** The purchaser, when they aren't the ticketholder */
  boughtBy?: string
  /**
   * Sort under this instead of `name`. Keeps a party's unnamed extras sitting
   * beside the person who bought them rather than stranded under "G".
   */
  sortAs?: string
  /** Came from a checkout nobody has matched to a real Venmo payment yet */
  unconfirmed?: boolean
}

/** Trim and collapse runs of internal whitespace, so " Zoe  Zane " reads right */
function cleanName(value: string): string {
  return (value || '').trim().replace(/\s+/g, ' ')
}

function sortKey(value: string, mode: GuestSort): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  // Single-word entries have no surname to promote, so they sort as themselves
  if (mode === 'last' && parts.length > 1) {
    return [parts[parts.length - 1], ...parts.slice(0, -1)].join(' ').toLowerCase()
  }
  return parts.join(' ').toLowerCase()
}

/**
 * Flattens a show's sales into one row per ticket, alphabetized for the door.
 *
 * Ticket count is the source of truth, not name count: a sale for three that
 * names two people still yields three rows, because the door needs to know a
 * third person is covered. Sales logged by hand carry no per-ticket names, so
 * the buyer stands in for the first ticket and the rest become their guests.
 */
export function buildGuestList(
  sales: TicketSale[],
  mode: GuestSort = 'first',
  /**
   * Pending checkouts to fold in. Excluded by default and marked when
   * included: these people started a payment, which is not the same as
   * having paid.
   */
  pendingOrders: { names: string[]; qty: number }[] = []
): GuestListEntry[] {
  const entries: GuestListEntry[] = []

  for (const sale of sales) {
    const buyer = cleanName(sale.name) || 'Unnamed buyer'
    const names = (sale.ticketNames || []).map(cleanName).filter(Boolean)
    const qty = Math.max(1, sale.qty || 1)

    if (names.length > 0) {
      for (const n of names) {
        entries.push(
          n.toLowerCase() === buyer.toLowerCase() ? { name: n } : { name: n, boughtBy: buyer }
        )
      }
      // Tickets the buyer never named still get a line — never silently dropped
      for (let i = names.length; i < qty; i++) {
        entries.push({ name: `Guest of ${buyer}`, boughtBy: buyer, sortAs: buyer })
      }
    } else {
      entries.push({ name: buyer })
      for (let i = 1; i < qty; i++) {
        entries.push({ name: `Guest of ${buyer}`, boughtBy: buyer, sortAs: buyer })
      }
    }
  }

  for (const order of pendingOrders) {
    const names = (order.names || []).map(cleanName).filter(Boolean)
    const qty = Math.max(1, order.qty || 1)
    const anchor = names[0] || 'Unnamed checkout'
    if (names.length === 0) entries.push({ name: anchor, unconfirmed: true })
    else for (const n of names) entries.push({ name: n, unconfirmed: true })
    for (let i = Math.max(1, names.length); i < qty; i++) {
      entries.push({ name: `Guest of ${anchor}`, sortAs: anchor, unconfirmed: true })
    }
  }

  return entries.sort((a, b) => {
    const ka = sortKey(a.sortAs ?? a.name, mode)
    const kb = sortKey(b.sortAs ?? b.name, mode)
    const cmp = ka.localeCompare(kb, 'en', { sensitivity: 'base' })
    // Named guests before the "Guest of" filler when they share a sort key
    return cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  })
}

/** Plain text a phone can copy and a printer can handle */
export function formatGuestList({
  venue,
  datetime,
  entries,
  purchases,
}: {
  venue: string
  datetime?: string
  entries: GuestListEntry[]
  purchases: number
}): string {
  const width = String(entries.length).length
  // Pad names to a common column so the annotations line up on paper, but not
  // so far that one long name pushes every other line off a phone screen
  const nameCol = Math.min(28, entries.reduce((w, e) => Math.max(w, e.name.length), 0))
  const unconfirmed = entries.filter(e => e.unconfirmed).length
  const lines = entries.map((e, i) => {
    const num = `${String(i + 1).padStart(width, ' ')}.`
    const mark = e.unconfirmed ? ' *' : ''
    const note = e.boughtBy ? `  — bought by ${e.boughtBy}` : ''
    if (!note && !mark) return `${num} ${e.name}`
    return `${num} ${e.name.padEnd(nameCol, ' ')}${note}${mark}`
  })

  const header = [
    `${venue} — Guest List`,
    datetime ? formatDateTime(datetime) : null,
    `${entries.length} ${entries.length === 1 ? 'guest' : 'guests'} · ${purchases} ${purchases === 1 ? 'purchase' : 'purchases'}`,
  ].filter(Boolean)

  const footer = unconfirmed
    ? ['', `* ${unconfirmed} unconfirmed — started a Venmo checkout; payment not verified.`]
    : []

  return [...header, '', ...lines, ...footer, ''].join('\n')
}

/** Filesystem-safe filename like "the-delancey-guest-list-2026-08-22.txt" */
export function guestListFilename(venue: string, datetime?: string): string {
  const slug =
    venue
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'show'
  // Eastern date parts: an 8pm ET show is already tomorrow in UTC, and the
  // filename should read as the night the band played
  const day = datetime ? toEasternIso(datetime).slice(0, 10) : ''
  return `${slug}-guest-list${day ? `-${day}` : ''}.txt`
}

// ─── Show money ─────────────────────────────────────────────────────────────

export interface ShowFinancials {
  /** Presale tickets — the ones with names attached */
  ticketsSold: number
  /** Walk-ups counted at the door */
  doorCount: number
  /** Presale plus walk-ups */
  totalTickets: number
  /** Presale money, from Venmo and the door list */
  ticketRevenue: number
  /** Cash taken at the door on the night */
  doorRevenue: number
  /** Sum of the itemized deductions */
  expensesTotal: number
  /** Everything in: tickets, plus any venue payout and merch logged in stats */
  gross: number
  /** Everything out: itemized expenses plus the free-form costs field */
  outgoings: number
  /** What the band actually keeps */
  bandPayout: number
}

/**
 * The one place show money is added up.
 *
 * The show page and the history page both render these numbers, and they used
 * to compute them separately — which is how two screens start disagreeing about
 * what a night earned. Venue payout, merch, and the free-form costs field are
 * folded in so shows paid a flat fee still total correctly; for a night the
 * band self-promoted they are all zero and this reduces to tickets minus
 * expenses.
 */
export function showFinancials(show: {
  ticketSales?: TicketSale[]
  expenses?: ShowExpense[]
  doorSales?: DoorSales
  stats?: { payout?: number; merchSales?: number; costs?: number }
}): ShowFinancials {
  const sales = show.ticketSales || []
  const ticketsSold = sales.reduce((n, s) => n + (s.qty || 0), 0)
  const ticketRevenue = roundMoney(sales.reduce((n, s) => n + (s.amount || 0), 0))
  const doorCount = show.doorSales?.count || 0
  const doorRevenue = roundMoney(show.doorSales?.amount || 0)
  const expensesTotal = roundMoney(
    (show.expenses || []).reduce((n, e) => n + (e.amount || 0), 0)
  )
  const stats = show.stats || {}
  const gross = roundMoney(
    ticketRevenue + doorRevenue + (stats.payout || 0) + (stats.merchSales || 0)
  )
  const outgoings = roundMoney(expensesTotal + (stats.costs || 0))
  return {
    ticketsSold,
    doorCount,
    totalTickets: ticketsSold + doorCount,
    ticketRevenue,
    doorRevenue,
    expensesTotal,
    gross,
    outgoings,
    bandPayout: roundMoney(gross - outgoings),
  }
}
