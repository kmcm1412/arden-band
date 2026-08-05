import { adminDb } from '@/lib/firebase/admin'

// @ardenjams channel — resolved from the handle; uploads RSS needs no API key
export const YOUTUBE_CHANNEL_ID = 'UCb4n8sotiV3k9DFqTLMvf2g'

export interface VideoEntry {
  youtubeId: string
  title: string
  description?: string
  featured?: boolean
  publishedAt?: string
  isShort?: boolean
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
 * Shorts vs regular classification, persisted in siteContent/videoMeta so each
 * video is only ever checked against YouTube once. youtube.com/shorts/<id>
 * returns 200 for a real Short and a redirect for a regular video.
 */
async function classifyShorts(ids: string[]): Promise<Record<string, boolean>> {
  const ref = adminDb.collection('siteContent').doc('videoMeta')
  let known: Record<string, boolean> = {}
  try {
    const doc = await ref.get()
    known = (doc.data()?.shorts as Record<string, boolean>) || {}
  } catch {
    return {}
  }

  const unknown = ids.filter(id => !(id in known))
  if (unknown.length > 0) {
    const fresh: Record<string, boolean> = {}
    await Promise.all(unknown.map(async id => {
      try {
        const r = await fetch(`https://www.youtube.com/shorts/${id}`, {
          method: 'HEAD',
          redirect: 'manual',
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        fresh[id] = r.status === 200
      } catch {
        // Leave unclassified on network failure — retried next request
      }
    }))
    if (Object.keys(fresh).length > 0) {
      known = { ...known, ...fresh }
      ref.set({ shorts: known }, { merge: true }).catch(() => {})
    }
  }
  return known
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

  const shortsMap = await classifyShorts([...byId.keys()])
  for (const entry of byId.values()) {
    entry.isShort = shortsMap[entry.youtubeId] === true
  }

  return [...byId.values()].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
  })
}
