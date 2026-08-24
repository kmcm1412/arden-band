import { adminDb } from '@/lib/firebase/admin'
import { resolveAboutImage } from '@/lib/site'

/**
 * Server-side read of the editable public-site content (siteContent/home).
 * Returns {} on any failure so pages fall back to their hardcoded defaults.
 */
export async function getSiteContent(): Promise<Record<string, string>> {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    if (!doc.exists) return {}
    const data = doc.data() as Record<string, string>
    // Normalized here so every page gets a usable image without repeating the
    // fallback at each call site
    return { ...data, aboutImage: resolveAboutImage(data.aboutImage) }
  } catch {
    return {}
  }
}
