/**
 * Turns pasted text into a link that is safe to render.
 *
 * Returns null for anything that isn't http(s). These URLs end up in real
 * anchors on a page band members open on their phones, so a pasted
 * `javascript:` or `data:` value must never survive to become clickable.
 * A bare "instagram.com/p/x" is assumed to mean https.
 */
export function normalizeUrl(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

const SOCIAL_HOSTS: [RegExp, string][] = [
  [/^(m\.)?instagram\.com$/, 'Instagram'],
  [/^instagr\.am$/, 'Instagram'],
  [/^(vm\.|vt\.|m\.)?tiktok\.com$/, 'TikTok'],
  [/^(mobile\.)?(twitter\.com|x\.com)$/, 'X'],
  [/^t\.co$/, 'X'],
  [/^(m\.|web\.)?facebook\.com$/, 'Facebook'],
  [/^fb\.(com|watch|me)$/, 'Facebook'],
  [/^threads\.(net|com)$/, 'Threads'],
  [/^(www\.)?youtube\.com$/, 'YouTube'],
  [/^youtu\.be$/, 'YouTube'],
  [/^(open\.)?spotify\.com$/, 'Spotify'],
  [/^soundcloud\.com$/, 'SoundCloud'],
  [/^bsky\.app$/, 'Bluesky'],
  [/^reddit\.com$/, 'Reddit'],
]

/** Best guess at which platform a post lives on, from its host */
export function detectPlatform(url: string): string {
  const host = hostOf(url)
  if (!host) return 'Link'
  for (const [pattern, name] of SOCIAL_HOSTS) {
    if (pattern.test(host)) return name
  }
  // Fall back to the bare domain rather than a vague "Other", so an unusual
  // host still tells you where the post is
  return host.split('.')[0].replace(/^\w/, c => c.toUpperCase())
}

const RECORDING_HOSTS: [RegExp, string][] = [
  [/^(www\.)?youtube\.com$/, 'YouTube'],
  [/^youtu\.be$/, 'YouTube'],
  [/^soundcloud\.com$/, 'SoundCloud'],
  [/^drive\.google\.com$/, 'Google Drive'],
  [/^(www\.)?dropbox\.com$/, 'Dropbox'],
  [/^(open\.)?spotify\.com$/, 'Spotify'],
  [/^(www\.)?bandcamp\.com$/, 'Bandcamp'],
  [/\.bandcamp\.com$/, 'Bandcamp'],
  [/^vimeo\.com$/, 'Vimeo'],
  [/^(www\.)?icloud\.com$/, 'iCloud'],
]

/** Where a recording is hosted, for the label beside its link */
export function detectRecordingSource(url: string): string {
  const host = hostOf(url)
  if (!host) return 'Link'
  for (const [pattern, name] of RECORDING_HOSTS) {
    if (pattern.test(host)) return name
  }
  return host
}

/** The kinds of recording the band tends to end up with */
export const RECORDING_TYPES = ['Full set', 'Single song', 'Highlight', 'Audio only', 'Other'] as const
