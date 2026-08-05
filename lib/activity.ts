import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { User } from 'firebase/auth'

export interface ActivityEntry {
  id?: string
  actorUid: string
  actorName: string
  action: string // short verb phrase, e.g. "toggled section"
  detail: string // human-readable specifics, e.g. "Merch → off"
  at: string // ISO timestamp
}

/**
 * Append an entry to the shared dashboard activity log. Fire-and-forget:
 * logging must never block or break the action it describes.
 */
export function logActivity(user: User | null, action: string, detail: string) {
  if (!user) return
  addDoc(collection(db, 'activityLog'), {
    actorUid: user.uid,
    actorName: user.displayName || user.email || 'Unknown',
    action,
    detail,
    at: new Date().toISOString(),
  }).catch(err => console.error('[activity] log failed:', err))
}
