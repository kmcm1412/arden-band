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
