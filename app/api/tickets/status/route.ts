import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { isRateLimited } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Live "are tickets still on sale?" check for an already-open page.
 *
 * The public shows page is server-rendered, so a fan holding a tab open since
 * before sales closed would otherwise keep seeing a working checkout. The
 * widget polls this while visible and re-reads it the moment someone reaches
 * for the pay button.
 *
 * Served through the Admin SDK rather than the client Firestore SDK on purpose:
 * a listener would mean shipping firebase/firestore to every visitor of a
 * public marketing page for one boolean. Only that boolean is returned — no
 * prices, names, or sales figures.
 */
export async function GET(req: NextRequest) {
  const showId = req.nextUrl.searchParams.get('showId')
  if (!showId || showId.length > 200) {
    return NextResponse.json({ error: 'Invalid show' }, { status: 400 })
  }

  // The widget polls this every 45s per open tab, so the ceiling is generous —
  // it exists to stop a script hammering a Firestore read, not to limit fans
  if (await isRateLimited(req, { scope: 'status', windowMs: 10 * 60 * 1000, max: 120 })) {
    return NextResponse.json({ enabled: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const snap = await adminDb.collection('shows').doc(showId).get()
    if (!snap.exists) {
      return NextResponse.json({ enabled: false }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const show = snap.data() as {
      isPublic?: boolean
      status?: string
      ticketPrice?: number
      ticketSalesEnabled?: boolean
    }

    // Same conditions the checkout route enforces, so the widget can never show
    // a live button for something the API would refuse. Undefined means on.
    const price = typeof show.ticketPrice === 'number' ? show.ticketPrice : 0
    const enabled =
      show.isPublic === true &&
      price > 0 &&
      show.status !== 'cancelled' &&
      show.ticketSalesEnabled !== false

    return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[tickets] Status check failed:', err)
    // Fail open: a lookup blip must not block a fan who is trying to pay.
    // The checkout API is the authoritative guard either way.
    return NextResponse.json({ enabled: true }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
