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
  /** @deprecated superseded by ticketNameMode — old boolean kept for back-compat reads */
  ticketNamesRequired?: boolean
  /** Ticket sales ledger — trackable before and after the show */
  ticketSales?: TicketSale[]
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
  /** Number of tickets in this sale */
  qty: number
  method: 'venmo' | 'cash' | 'door' | 'other'
  /** Dollars received for this sale */
  amount: number
  note?: string
  addedAt: string
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
