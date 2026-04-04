import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Media — Arden' }

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

interface Video {
  id: string
  youtubeId: string
  title: string
  description: string
  featured: boolean
}

async function getVideos(): Promise<Video[]> {
  try {
    const snap = await adminDb.collection('media').orderBy('createdAt', 'desc').get()
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Video, 'id'>) }))
  } catch {
    return []
  }
}

export default async function MediaPage() {
  const [videos, content] = await Promise.all([getVideos(), getSiteContent()])
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const instagramHandle = content.instagramHandle || '@ardenjams'
  const featured = videos.find(v => v.featured)
  const rest = videos.filter(v => !v.featured)

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">Watch</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Media</h1>
        </div>

        {featured && (
          <div className="mb-16">
            <div className="relative aspect-video bg-arden-surface overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${featured.youtubeId}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={featured.title}
              />
            </div>
            <div className="mt-4">
              <p className="section-label mb-1">Featured</p>
              <h2 className="text-xl font-medium text-arden-white">{featured.title}</h2>
              <p className="text-arden-subtext text-sm">{featured.description}</p>
            </div>
          </div>
        )}

        <div className="mb-12 p-6 bg-arden-surface border border-arden-border">
          <p className="text-arden-subtext text-sm">Watch all videos on YouTube</p>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 text-arden-accent hover:text-arden-white transition-colors text-sm font-medium tracking-wider uppercase"
          >
            {instagramHandle} →
          </a>
        </div>

        {rest.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((video) => (
              <div key={video.id} className="group">
                <div className="relative aspect-video bg-arden-surface overflow-hidden mb-3">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                    loading="lazy"
                  />
                </div>
                <h3 className="font-medium text-arden-text group-hover:text-arden-accent transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-arden-subtext">{video.description}</p>
              </div>
            ))}
          </div>
        ) : (
          !featured && (
            <div className="py-20 text-center">
              <p className="text-arden-subtext text-lg">No videos yet.</p>
              <p className="text-arden-subtext text-sm mt-2">
                Subscribe on{' '}
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-arden-accent hover:text-arden-white transition-colors">
                  YouTube
                </a>{' '}
                for updates.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
