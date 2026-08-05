import { adminDb } from '@/lib/firebase/admin'

/**
 * Server-side read of the editable public-site content (siteContent/home).
 * Returns {} on any failure so pages fall back to their hardcoded defaults.
 */
export async function getSiteContent(): Promise<Record<string, string>> {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}
