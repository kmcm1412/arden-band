import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { isRateLimited } from '@/lib/rate-limit'
import { roundMoney } from '@/lib/utils'
import { buildVenmoNote, resolveNameMode, MAX_TICKETS } from '@/lib/tickets'

export const dynamic = 'force-dynamic'

const MAX_NAME_LEN = 100

/**
 * Records a ticket checkout started from the public Venmo widget.
 *
 * This captures *intent* only — Venmo gives personal accounts no webhook, so
 * nothing here proves money moved. Orders land as 'pending' and are excluded
 * from every money total until an admin confirms them against the real Venmo
 * feed. The price is read from the show document rather than the request body,
 * so a tampered client can't invent an amount.
 */
export async function POST(req: NextRequest) {
  try {
    // 60 rather than 30: this is per IP, and a venue's shared wifi is one IP.
    // A failed record is silent — the widget still sends the fan to Venmo, so
    // they pay and the band simply loses the order. Losing real sales data to a
    // throttle is worse than the scripted writes this is guarding against.
    if (await isRateLimited(req, { scope: 'tickets', windowMs: 10 * 60 * 1000, max: 60 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()
    const { showId, qty, names } = body

    if (typeof showId !== 'string' || !showId || showId.length > 200) {
      return NextResponse.json({ error: 'Invalid show' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_TICKETS) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }
    if (names !== undefined && !Array.isArray(names)) {
      return NextResponse.json({ error: 'Invalid names' }, { status: 400 })
    }

    const snap = await adminDb.collection('shows').doc(showId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }
    const show = snap.data() as {
      venue?: string
      datetime?: string
      isPublic?: boolean
      status?: string
      ticketPrice?: number
      ticketSalesEnabled?: boolean
      ticketNameMode?: 'none' | 'party' | 'all' | null
      ticketNamesRequired?: boolean | null
    }

    // Only shows that are actually selling tickets publicly can take checkouts.
    // The switch is re-checked here rather than trusted to the widget: a page
    // loaded before sales were turned off would otherwise still file orders.
    // Undefined means enabled, matching the public page and the dashboard.
    const price = typeof show.ticketPrice === 'number' ? show.ticketPrice : 0
    if (
      !show.isPublic ||
      price <= 0 ||
      show.status === 'cancelled' ||
      show.ticketSalesEnabled === false
    ) {
      return NextResponse.json({ error: 'Tickets not available for this show' }, { status: 400 })
    }

    const nameMode = resolveNameMode(show)
    const cleanNames = (Array.isArray(names) ? names : [])
      .filter((n): n is string => typeof n === 'string')
      .map(n => n.trim().slice(0, MAX_NAME_LEN))
      .filter(Boolean)
      .slice(0, qty)

    // Mirrors the widget's own gate, so a stored order always carries the names
    // the band needs at the door
    if (nameMode === 'party' && cleanNames.length < 1) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }
    if (nameMode === 'all' && cleanNames.length < qty) {
      return NextResponse.json({ error: 'A name is required for every ticket' }, { status: 400 })
    }

    const venue = show.venue || 'Show'
    const amount = roundMoney(qty * price)
    const note = buildVenmoNote({ qty, total: amount, venue, nameMode, names: cleanNames })

    const ref = await adminDb.collection('ticketOrders').add({
      showId,
      showVenue: venue,
      showDatetime: show.datetime || '',
      names: nameMode === 'party' ? cleanNames.slice(0, 1) : cleanNames,
      nameMode,
      qty,
      unitPrice: price,
      amount,
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, orderId: ref.id })
  } catch (err) {
    console.error('[tickets] Checkout record error:', err)
    return NextResponse.json({ error: 'Failed to record checkout' }, { status: 500 })
  }
}
