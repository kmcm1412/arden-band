import { adminDb } from '@/lib/firebase/admin'

export interface SectionVisibility {
  merch: boolean
  media: boolean
  shows: boolean
  fanlist: boolean
}

export const DEFAULT_VISIBILITY: SectionVisibility = {
  merch: true,
  media: true,
  shows: true,
  fanlist: true,
}

/** Server-side read of which public sections/pages are enabled (defaults to all on). */
export async function getVisibility(): Promise<SectionVisibility> {
  try {
    const doc = await adminDb.collection('siteContent').doc('visibility').get()
    return doc.exists ? { ...DEFAULT_VISIBILITY, ...(doc.data() as Partial<SectionVisibility>) } : DEFAULT_VISIBILITY
  } catch {
    return DEFAULT_VISIBILITY
  }
}
