import { NextRequest } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

/**
 * Verifies the request carries a valid Firebase ID token belonging to any
 * active member, admin or not. Throws 'Unauthorized' (no/bad token) or
 * 'Forbidden' (no active membership) — API routes map these to 401/403.
 *
 * Separate from verifyAdmin because confirming someone else's financial edit
 * is a job for any bandmate, not only the people who can make the edit.
 */
export async function verifyMember(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
  const snap = await adminDb.collection('memberships').doc(decoded.uid).get()
  const membership = snap.data()
  if (!snap.exists || !membership?.active) throw new Error('Forbidden')
  return { decoded, membership }
}
