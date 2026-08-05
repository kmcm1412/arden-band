import { NextRequest } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

/**
 * Verifies the request carries a valid Firebase ID token belonging to an
 * active admin. Throws 'Unauthorized' (no/bad token) or 'Forbidden' (not an
 * active admin) — API routes map these to 401/403.
 */
export async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
  const membership = await adminDb.collection('memberships').doc(decoded.uid).get()
  if (!membership.exists || membership.data()?.role !== 'admin' || !membership.data()?.active) {
    throw new Error('Forbidden')
  }
  return decoded
}
