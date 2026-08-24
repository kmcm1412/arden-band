export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ardenband.com'
export const SITE_NAME = 'Arden'
export const SITE_DESCRIPTION =
  'Official website of Arden, a Long Island-based jam band. Upcoming shows, live videos, merch, and updates.'

/**
 * The band photo, served as a static CDN file rather than stored in Firestore.
 *
 * It used to live in siteContent/home as a base64 data URI: 173KB inlined into
 * the HTML of /about and /links, uncacheable, and pulled from Firestore on every
 * page render because that document is read site-wide. Firebase Storage is the
 * natural home but the project has no billing account and Storage requires one,
 * so the file lives in /public. It changes rarely enough that a deploy is a fair
 * price for an immutable, cacheable asset.
 *
 * Lives here rather than in site-content.ts so client components can import it
 * without dragging firebase-admin into the browser bundle.
 */
export const ABOUT_IMAGE_FALLBACK = '/about.jpg'

/** Prefers an explicitly set URL, falling back to the static file */
export function resolveAboutImage(value?: string | null): string {
  return (value || '').trim() || ABOUT_IMAGE_FALLBACK
}
