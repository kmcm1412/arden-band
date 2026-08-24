import { notFound } from 'next/navigation'
import { getVisibility } from '@/lib/visibility'
import { getMergedVideos } from '@/lib/youtube'
import { getSiteContent } from '@/lib/site-content'
import LiteYouTube from '@/components/LiteYouTube'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Media — Arden',
  description: 'Watch Arden live — full sets, jams, and sessions from the Long Island jam band.',

  alternates: { canonical: '/media' },
  openGraph: {
    url: '/media',
    siteName: 'Arden',
    description: 'Watch Arden live — full sets, jams, and sessions from the Long Island jam band.',
  },
}

export default async function MediaPage() {
  const visibility = await getVisibility()
  if (!visibility.media) notFound()

  const [videos, content] = await Promise.all([getMergedVideos(), getSiteContent()])
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const youtubeHandle = content.youtubeHandle || '@ardenjams'
  const longform = videos.filter(v => !v.isShort)
  const shorts = videos.filter(v => v.isShort)
  const featured = longform.find(v => v.featured) || longform[0]
  const rest = longform.filter(v => v.youtubeId !== featured?.youtubeId)

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
              <LiteYouTube videoId={featured.youtubeId} title={featured.title} />
            </div>
            <div className="mt-4">
              <p className="section-label mb-1">Featured</p>
              <h2 className="text-xl font-medium text-arden-white">{featured.title}</h2>
              {featured.description && <p className="text-arden-subtext text-sm">{featured.description}</p>}
            </div>
          </div>
        )}

        {/* FULL SETS & VIDEOS */}
        {rest.length > 0 && (
          <div className="mb-20">
            <div className="mb-8">
              <p className="section-label mb-2">Live &amp; Full Length</p>
              <h2 className="heading-display text-3xl text-arden-white">Videos</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((video) => (
                <div key={video.youtubeId} className="group">
                  <div className="relative aspect-video bg-arden-surface overflow-hidden mb-3">
                    <LiteYouTube videoId={video.youtubeId} title={video.title} />
                  </div>
                  <h3 className="font-medium text-arden-text group-hover:text-arden-accent transition-colors line-clamp-2">
                    {video.title}
                  </h3>
                  {video.description && <p className="text-sm text-arden-subtext line-clamp-2">{video.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHORTS */}
        {shorts.length > 0 && (
          <div className="mb-20">
            <div className="mb-8">
              <p className="section-label mb-2">Quick Hits</p>
              <h2 className="heading-display text-3xl text-arden-white">Shorts</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {shorts.map((video) => (
                <div key={video.youtubeId} className="group">
                  <div className="relative aspect-[9/16] bg-arden-surface overflow-hidden mb-2">
                    <LiteYouTube videoId={video.youtubeId} title={video.title} vertical />
                  </div>
                  <h3 className="text-xs text-arden-subtext group-hover:text-arden-accent transition-colors line-clamp-2">
                    {video.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length === 0 && (
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
        )}

        <div className="p-6 bg-arden-surface border border-arden-border">
          <p className="text-arden-subtext text-sm">Watch everything on YouTube</p>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 text-arden-accent hover:text-arden-white transition-colors text-sm font-medium tracking-wider uppercase"
          >
            {youtubeHandle} →
          </a>
        </div>
      </div>
    </div>
  )
}
