import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAdmin } from '@/lib/auth/verify-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 401 })
  }
  try {
    const snap = await adminDb.collection('subscribers').orderBy('subscribedAt', 'desc').get()
    const subscribers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ subscribers, total: subscribers.length })
  } catch (err) {
    console.error('Subscribers GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
