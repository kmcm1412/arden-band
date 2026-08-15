import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAdmin } from '@/lib/auth/verify-admin'
import type { TicketOrder, TicketSale } from '@/lib/types'

export const dynamic = 'force-dynamic'

function authError(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unauthorized'
  return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 401 })
}

function genId() {
  return crypto.randomUUID().slice(0, 8)
}

/**
 * Lists Venmo checkouts. Orders hold fan names, so they live behind the Admin
 * SDK (rules deny all client access) and are served only to active admins.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req)
  } catch (err) {
    return authError(err)
  }
  try {
    const showId = req.nextUrl.searchParams.get('showId')
    const col = adminDb.collection('ticketOrders')
    // Filtered by showId in memory: avoids a composite index for a collection
    // that stays small, and keeps a single createdAt sort for every caller
    const snap = await col.orderBy('createdAt', 'desc').get()
    const orders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as TicketOrder)
      .filter(o => !showId || o.showId === showId)
    return NextResponse.json({ orders, total: orders.length })
  } catch (err) {
    console.error('[tickets] Orders GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Confirms or voids a pending checkout.
 *
 * Confirming is what turns intent into money: it appends a TicketSale to the
 * show's ledger (the only thing the stats count) and stamps the order, both in
 * one transaction so a confirm can never double-post a sale.
 */
export async function PATCH(req: NextRequest) {
  let actor
  try {
    actor = await verifyAdmin(req)
  } catch (err) {
    return authError(err)
  }
  try {
    const { orderId, action } = await req.json()
    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
    }
    if (action !== 'confirm' && action !== 'void' && action !== 'unconfirm') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const orderRef = adminDb.collection('ticketOrders').doc(orderId)

    const result = await adminDb.runTransaction(async txn => {
      const orderSnap = await txn.get(orderRef)
      if (!orderSnap.exists) throw new Error('NOT_FOUND')
      const order = orderSnap.data() as TicketOrder

      const showRef = adminDb.collection('shows').doc(order.showId)
      const showSnap = await txn.get(showRef)
      const sales = (showSnap.data()?.ticketSales || []) as TicketSale[]

      if (action === 'confirm') {
        if (order.status === 'confirmed') throw new Error('ALREADY_CONFIRMED')
        const sale: TicketSale = {
          id: genId(),
          name: order.names.length > 0 ? order.names.join(', ') : 'Venmo checkout',
          qty: order.qty,
          method: 'venmo',
          amount: order.amount,
          note: `Venmo checkout — "${order.note}"`,
          addedAt: new Date().toISOString(),
        }
        if (showSnap.exists) txn.update(showRef, { ticketSales: [...sales, sale] })
        txn.update(orderRef, {
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          confirmedBy: actor.email || actor.uid,
          saleId: sale.id,
        })
        return { status: 'confirmed', sale }
      }

      // 'void' and 'unconfirm' both pull the order back out of the money totals
      if (order.saleId && showSnap.exists) {
        txn.update(showRef, { ticketSales: sales.filter(s => s.id !== order.saleId) })
      }
      txn.update(orderRef, {
        status: action === 'void' ? 'void' : 'pending',
        confirmedAt: FieldValue.delete(),
        confirmedBy: FieldValue.delete(),
        saleId: FieldValue.delete(),
      })
      return { status: action === 'void' ? 'void' : 'pending' }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (msg === 'ALREADY_CONFIRMED') {
      return NextResponse.json({ error: 'Order is already confirmed' }, { status: 409 })
    }
    console.error('[tickets] Orders PATCH error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
