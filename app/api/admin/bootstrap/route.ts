import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

// One-time admin bootstrap endpoint.
// Requires BOOTSTRAP_SECRET env var to be set.
// After first admin is created, this should be disabled.
export async function POST(req: NextRequest) {
  const secret = process.env.BOOTSTRAP_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Bootstrap not configured' }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (body.secret !== secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const { email } = body
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get or create Firebase Auth user
    let userRecord
    try {
      userRecord = await adminAuth.getUserByEmail(email)
    } catch {
      return NextResponse.json(
        { error: 'User must sign in with Firebase Auth first before being bootstrapped' },
        { status: 400 }
      )
    }

    // Check if any admin already exists
    const existingAdmins = await adminDb
      .collection('memberships')
      .where('role', '==', 'admin')
      .where('active', '==', true)
      .limit(1)
      .get()

    if (!existingAdmins.empty) {
      return NextResponse.json({ error: 'Admin already exists. Use the dashboard to manage users.' }, { status: 409 })
    }

    // Create admin membership
    await adminDb.collection('memberships').doc(userRecord.uid).set({
      email: userRecord.email,
      role: 'admin',
      active: true,
      invitedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      displayName: userRecord.displayName || email.split('@')[0],
    })

    return NextResponse.json({ ok: true, uid: userRecord.uid, email: userRecord.email })
  } catch (err) {
    console.error('Bootstrap error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
