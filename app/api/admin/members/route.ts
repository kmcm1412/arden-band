import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const token = authHeader.slice(7)
  const decoded = await adminAuth.verifyIdToken(token)
  const membership = await adminDb.collection('memberships').doc(decoded.uid).get()
  if (!membership.exists || membership.data()?.role !== 'admin' || !membership.data()?.active) {
    throw new Error('Forbidden')
  }
  return decoded
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req)
    const snapshot = await adminDb.collection('memberships').get()
    const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
    return NextResponse.json({ members })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Forbidden' ? 403 : 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const { email, role } = body

    if (!email || !role || !['admin', 'band_member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Look up user — if they haven't signed in yet, store a pending invitation
    // so access is granted automatically on their first login
    let userRecord
    try {
      userRecord = await adminAuth.getUserByEmail(email)
    } catch {
      // User hasn't created a Firebase account yet — save pending invitation by email
      await adminDb.collection('pendingInvitations').doc(email).set({
        email,
        role,
        invitedAt: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, pending: true, message: 'Invitation saved. Access will be granted when they first sign in.' })
    }

    await adminDb.collection('memberships').doc(userRecord.uid).set({
      email: userRecord.email,
      role,
      active: true,
      invitedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      displayName: userRecord.displayName || email.split('@')[0],
    }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await verifyAdmin(req)
    const body = await req.json()
    const { uid, active, role } = body

    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (typeof active === 'boolean') update.active = active
    if (role && ['admin', 'band_member'].includes(role)) update.role = role

    await adminDb.collection('memberships').doc(uid).update(update)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
