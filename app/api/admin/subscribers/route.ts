import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
  const membership = await adminDb.collection('memberships').doc(decoded.uid).get()
  if (!membership.exists || membership.data()?.role !== 'admin' || !membership.data()?.active) {
    throw new Error('Forbidden')
  }
  return decoded
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req)
    const snap = await adminDb.collection('subscribers').orderBy('subscribedAt', 'desc').get()
    const subscribers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ subscribers, total: subscribers.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 401 })
  }
}
