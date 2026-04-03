export const metadata = { title: 'Media — Arden' }

const VIDEOS = [
  { id: 'dQw4w9WgXcQ', title: 'Live at The Foundry', description: 'Full live set, May 2024', featured: true },
  { id: 'dQw4w9WgXcQ', title: 'Studio Session Vol. 1', description: 'Behind the scenes in the studio', featured: false },
  { id: 'dQw4w9WgXcQ', title: 'Acoustic Set', description: 'Stripped-back acoustic performance', featured: false },
  { id: 'dQw4w9WgXcQ', title: 'Rehearsal Cuts', description: 'Unfiltered rehearsal footage', featured: false },
  { id: 'dQw4w9WgXcQ', title: 'Music Video: Coming Soon', description: 'Official music video', featured: false },
  { id: 'dQw4w9WgXcQ', title: 'Live at Rockwood', description: 'NYC performance', featured: false },
]

export default function MediaPage() {
  const featured = VIDEOS.find(v => v.featured)
  const rest = VIDEOS.filter(v => !v.featured)

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">Watch</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Media</h1>
        </div>

        {/* Featured video */}
        {featured && (
          <div className="mb-16">
            <div className="relative aspect-video bg-arden-surface overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${featured.id}`}
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

        {/* YouTube channel link */}
        <div className="mb-12 p-6 bg-arden-surface border border-arden-border">
          <p className="text-arden-subtext text-sm">Watch all videos on YouTube</p>
          <a
            href="https://youtube.com/@ardenjams"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 text-arden-accent hover:text-arden-white transition-colors text-sm font-medium tracking-wider uppercase"
          >
            @ardenjams →
          </a>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((video, i) => (
            <div key={i} className="group">
              <div className="relative aspect-video bg-arden-surface overflow-hidden mb-3">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
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
      </div>
    </div>
  )
}
