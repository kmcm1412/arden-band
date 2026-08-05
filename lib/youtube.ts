import { adminDb } from '@/lib/firebase/admin'

// @ardenjams channel — resolved from the handle; uploads RSS needs no API key
export const YOUTUBE_CHANNEL_ID = 'UCb4n8sotiV3k9DFqTLMvf2g'

export interface VideoEntry {
  youtubeId: string
  title: string
  description?: string
  featured?: boolean
  publishedAt?: string
}

function decodeXml(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Latest uploads from the channel RSS feed (cached for 30 min). */
export async function getChannelUploads(): Promise<VideoEntry[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return []
    const xml = await res.text()
    const entries: VideoEntry[] = []
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g
    let m
    while ((m = entryRe.exec(xml)) !== null) {
      const block = m[1]
      const youtubeId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
      const title = block.match(/<title>([^<]*)<\/title>/)?.[1]
      const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1]
      if (youtubeId && title) entries.push({ youtubeId, title: decodeXml(title), publishedAt })
    }
    return entries
  } catch (err) {
    console.error('[youtube] RSS fetch failed:', err)
    return []
  }
}

/**
 * Curated Firestore videos merged with the channel's latest uploads.
 * Firestore wins on curation (featured flag, description); RSS adds anything
 * new automatically so the site stays current without dashboard work.
 */
export async function getMergedVideos(): Promise<VideoEntry[]> {
  const [uploads, snap] = await Promise.all([
    getChannelUploads(),
    adminDb.collection('media').get().catch(() => null),
  ])

  const byId = new Map<string, VideoEntry>()
  for (const u of uploads) byId.set(u.youtubeId, u)

  if (snap) {
    for (const d of snap.docs) {
      const data = d.data() as { youtubeId: string; title: string; description?: string; featured?: boolean; createdAt?: string }
      if (!data.youtubeId) continue
      const existing = byId.get(data.youtubeId)
      byId.set(data.youtubeId, {
        youtubeId: data.youtubeId,
        title: data.title || existing?.title || '',
        description: data.description,
        featured: data.featured,
        publishedAt: existing?.publishedAt || data.createdAt,
      })
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
  })
}
