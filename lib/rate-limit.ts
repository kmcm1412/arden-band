import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

/** How long a throttle document stays interesting before it is just litter */
const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000
/** Cap on deletions per sweep, so a request never pays for a big backlog */
const PRUNE_BATCH = 25
/** Roughly one request in this many triggers a sweep */
const PRUNE_ODDS = 25

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return fwd || req.headers.get('x-nf-client-connection-ip') || 'unknown'
}

/**
 * Drops throttle documents whose window closed long ago.
 *
 * Nothing else ever deleted these, so the collection only grew — an audit found
 * 17 of 19 documents stale. Run opportunistically and capped: cleanup is not
 * worth making a real request wait, and skipping a sweep costs nothing because
 * the next request will do it.
 */
async function pruneExpired(): Promise<void> {
  try {
    const cutoff = Date.now() - PRUNE_AFTER_MS
    const stale = await adminDb
      .collection('rateLimits')
      .where('windowStart', '<', cutoff)
      .limit(PRUNE_BATCH)
      .get()
    if (stale.empty) return
    const batch = adminDb.batch()
    stale.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  } catch {
    /* housekeeping must never affect the response */
  }
}

/**
 * Firestore-backed per-IP throttle. Serverless instances share no memory, so
 * the counter has to live somewhere both cold and warm invocations can see.
 *
 * Returns true when the caller has exceeded the limit. Fails open: if the
 * throttle itself errors, a legitimate visitor still gets through, because
 * losing a real message costs more than letting one extra request past.
 */
export async function isRateLimited(
  req: NextRequest,
  { scope, windowMs, max }: { scope: string; windowMs: number; max: number }
): Promise<boolean> {
  try {
    // Sanitized for use as a document id
    const ip = clientIp(req).replace(/[^a-zA-Z0-9.:_-]/g, '')
    const ref = adminDb.collection('rateLimits').doc(`${scope}:${ip}`)
    const now = Date.now()
    const snap = await ref.get()
    const data = snap.data()

    if (data && now - data.windowStart < windowMs) {
      if (data.count >= max) return true
      await ref.update({ count: data.count + 1 })
    } else {
      await ref.set({ count: 1, windowStart: now })
    }

    if (Math.random() < 1 / PRUNE_ODDS) void pruneExpired()
    return false
  } catch (err) {
    console.error(`[rate-limit] check failed for ${scope}:`, err)
    return false
  }
}
