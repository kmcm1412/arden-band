import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verifyAdmin } from '@/lib/auth/verify-admin'

export const dynamic = 'force-dynamic'

function authErrorResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unauthorized'
  if (msg === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req)
  } catch (err) {
    return authErrorResponse(err)
  }
  try {
    const snapshot = await adminDb.collection('memberships').get()
    const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
    return NextResponse.json({ members })
  } catch (err) {
    console.error('Members GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req)
  } catch (err) {
    return authErrorResponse(err)
  }
  try {
    const body = await req.json()
    const role = body.role
    // Normalize email — Firebase ID tokens carry lowercase emails, so invitations
    // must be stored lowercase or the first-login lookup will miss them
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

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
  } catch (err) {
    console.error('Members POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  let decoded
  try {
    decoded = await verifyAdmin(req)
  } catch (err) {
    return authErrorResponse(err)
  }
  try {
    const body = await req.json()
    const { uid, active, role } = body

    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    // Admins can't demote or deactivate themselves — prevents accidental lockout
    if (uid === decoded.uid) {
      return NextResponse.json({ error: "You can't change your own membership. Ask another admin." }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (typeof active === 'boolean') update.active = active
    if (role && ['admin', 'band_member'].includes(role)) update.role = role

    await adminDb.collection('memberships').doc(uid).update(update)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Members PATCH error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
