import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(token)

    const membershipDoc = await adminDb.collection('memberships').doc(decoded.uid).get()

    if (!membershipDoc.exists) {
      // Check if there's a pending invitation for this email
      const email = decoded.email
      if (email) {
        const pending = await adminDb.collection('pendingInvitations').doc(email).get()
        if (pending.exists) {
          const inv = pending.data()!
          // Promote to full membership
          const newMembership = {
            email,
            role: inv.role,
            active: true,
            invitedAt: inv.invitedAt,
            approvedAt: new Date().toISOString(),
            displayName: decoded.name || email.split('@')[0],
          }
          await Promise.all([
            adminDb.collection('memberships').doc(decoded.uid).set(newMembership),
            adminDb.collection('pendingInvitations').doc(email).delete(),
          ])
          return NextResponse.json({ membership: { ...newMembership, uid: decoded.uid } })
        }
      }
      return NextResponse.json({ error: 'Not approved' }, { status: 403 })
    }

    const membership = membershipDoc.data()
    if (!membership?.active) {
      return NextResponse.json({ error: 'Access deactivated' }, { status: 403 })
    }

    return NextResponse.json({ membership: { ...membership, uid: decoded.uid } })
  } catch (err) {
    console.error('Membership check error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
