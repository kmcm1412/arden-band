export type UserRole = 'admin' | 'band_member'

export interface Membership {
  uid: string
  email: string
  role: UserRole
  active: boolean
  invitedAt: string
  approvedAt?: string
  displayName?: string
}

export interface Show {
  id?: string
  /** Optional label; public pages display venue instead */
  title?: string
  venue: string
  location: string
  datetime: string
  ticketLink?: string
  /** Free-text ticketing instructions (e.g. "Venmo $15 to @arden-band with your name + ticket count") */
  ticketInfo?: string
  /** Price per ticket in dollars — set > 0 to enable the Venmo checkout widget on the public shows page */
  ticketPrice?: number
  /**
   * What names the Venmo checkout collects for the payment note:
   * 'none' | 'party' (one name for will call) | 'all' (every ticketholder)
   */
  ticketNameMode?: 'none' | 'party' | 'all'
  /**
   * Venmo checkout style: 'full' = quantity picker + prefilled payment;
   * 'simple' = just the price and a link to the band's Venmo page
   */
  ticketWidgetMode?: 'full' | 'simple'
  /**
   * Master switch for public ticket sales on this show. Undefined means on —
   * shows that predate the toggle keep selling without needing a backfill.
   */
  ticketSalesEnabled?: boolean
  /** @deprecated superseded by ticketNameMode — old boolean kept for back-compat reads */
  ticketNamesRequired?: boolean
  /** Confirmed ticket sales ledger — the only source the money stats count */
  ticketSales?: TicketSale[]
  /** Itemized deductions taken out of ticket revenue (door, sound, venue cut) */
  expenses?: ShowExpense[]
  /** Walk-ups paid at the door, logged after the show — no names, just totals */
  doorSales?: DoorSales
  /** Post-show numbers, filled in by the band afterwards */
  stats?: ShowStats
  notes?: string
  status: 'confirmed' | 'pending' | 'cancelled'
  isPublic: boolean
  createdAt?: string
}

export interface TicketSale {
  id: string
  /** Buyer / party name */
  name: string
  /**
   * Who the tickets are actually for, when that differs from the buyer — a
   * fan often pays for the whole party. Used at the door for check-in.
   */
  ticketNames?: string[]
  /** Number of tickets in this sale */
  qty: number
  /**
   * How the ticket was accounted for. 'door-list' means the name came off the
   * printed list on the night rather than from a matched payment — the person
   * was let in, but no Venmo transaction was tied to them.
   */
  method: 'venmo' | 'cash' | 'door' | 'door-list' | 'other'
  /** Dollars received for this sale */
  amount: number
  note?: string
  /** When the money actually arrived — for imports, the Venmo payment time */
  addedAt: string
}

/**
 * A checkout started from the public Venmo ticket widget.
 *
 * Venmo has no webhook or callback for personal accounts, so the app only ever
 * learns that a fan *started* a payment — never that one settled. Orders are
 * therefore recorded as 'pending' and stay out of the money totals until an
 * admin matches them against the real Venmo history and confirms, which is what
 * mints the TicketSale that the stats actually count.
 */
export interface TicketOrder {
  id?: string
  showId: string
  /** Denormalized so the dashboard can show orders without re-reading the show */
  showVenue: string
  showDatetime: string
  /** Ticketholder names ('all' mode) or the single will-call name ('party') */
  names: string[]
  nameMode: 'none' | 'party' | 'all'
  qty: number
  /** Per-ticket price at checkout time, in dollars */
  unitPrice: number
  /** qty x unitPrice, computed server-side — never taken from the client */
  amount: number
  /** The exact Venmo note text, for matching against the Venmo transaction list */
  note: string
  status: 'pending' | 'confirmed' | 'void'
  createdAt: string
  confirmedAt?: string
  confirmedBy?: string
  /** Why an order was dismissed, when it was voided in bulk rather than by hand */
  voidReason?: string
  /** id of the TicketSale minted on confirm */
  saleId?: string
}

/**
 * Tickets sold at the door on the night. Deliberately just two numbers: these
 * are walk-ups, so there are no names to check in and the door price may not
 * match the presale price.
 */
export interface DoorSales {
  /** How many walked up */
  count: number
  /** Total dollars taken at the door */
  amount: number
}

/** One line item taken off the top, e.g. { label: 'Door & Sound', amount: 150 } */
export interface ShowExpense {
  /** Stable key so a row survives being edited or reordered */
  id: string
  label: string
  /** Dollars deducted */
  amount: number
}

export interface ShowStats {
  /** Headcount at the show (may differ from tickets sold) */
  attendance?: number
  /** What the band was paid by the venue/host */
  payout?: number
  /** Expenses: travel, gear, fees, etc. */
  costs?: number
  /** Merch revenue at the show */
  merchSales?: number
  /** Post-show debrief notes */
  notes?: string
}

export interface MerchItem {
  id?: string
  name: string
  description: string
  price: number
  imageUrl?: string
  category: string
  available: boolean
  createdAt?: string
}

export interface MediaItem {
  id?: string
  title: string
  youtubeId: string
  description?: string
  featured: boolean
  publishedAt?: string
}

export interface AvailabilityEntry {
  date: string
  time?: string
  type: 'available' | 'band_practice' | 'meeting' | 'show' | 'other'
  who?: string
  notes?: string
}

export interface Availability {
  id?: string
  userId: string
  userEmail: string
  userName: string
  dates: string[]
  entries: AvailabilityEntry[]
  updatedAt: string
}

export interface SetList {
  id?: string
  showId: string
  showTitle: string
  songs: SetListSong[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface SetListSong {
  id: string
  title: string
  key?: string
  notes?: string
  order: number
}

export interface Opportunity {
  id?: string
  venueName: string
  location: string
  email?: string
  notes?: string
  status: 'new' | 'contacted' | 'awaiting' | 'confirmed' | 'rejected'
  createdAt?: string
}

export interface ContactMessage {
  id?: string
  name: string
  email: string
  message: string
  createdAt?: string
  read: boolean
}
