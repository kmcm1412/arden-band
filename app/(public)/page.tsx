import Link from 'next/link'
import { ArrowRight, Camera, Play } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import SubscribeForm from '@/components/SubscribeForm'

export const dynamic = 'force-dynamic'

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

async function getFeaturedVideoId(): Promise<string | null> {
  try {
    const snap = await adminDb.collection('media').where('featured', '==', true).limit(1).get()
    if (!snap.empty) return snap.docs[0].data().youtubeId as string
    // Fall back to most recent video
    const latest = await adminDb.collection('media').orderBy('createdAt', 'desc').limit(1).get()
    if (!latest.empty) return latest.docs[0].data().youtubeId as string
    return null
  } catch {
    return null
  }
}

async function getUpcomingShows(limit = 3) {
  try {
    const snap = await adminDb
      .collection('shows')
      .where('isPublic', '==', true)
      .orderBy('datetime', 'asc')
      .limit(limit)
      .get()
    const now = new Date()
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as { id: string; datetime: string; venue: string; location: string })
      .filter(s => new Date(s.datetime) > now)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [content, upcomingShows, featuredVideoId] = await Promise.all([getSiteContent(), getUpcomingShows(), getFeaturedVideoId()])

  const estYear = content.estYear || '2022'
  const heroTagline = content.heroTagline || 'Indie rock from the ground up. Raw energy, honest songs, and a sound that keeps moving.'
  const bio = content.bio || 'Arden is an indie rock band crafting original music with an honest, lived-in sound. Formed through late-night rehearsals and relentless gigging, the band brings a raw energy to every performance — equal parts careful craft and in-the-moment feeling.'

  return (
    <div className="overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex items-end pb-24 px-6">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at 60% 40%, rgba(200,169,110,0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(200,169,110,0.04) 0%, transparent 50%), linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 100%)',
          }}
        />
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-px h-full bg-arden-border opacity-40" style={{ left: '8%' }} />
          <div className="absolute top-0 left-0 w-px h-full bg-arden-border opacity-20" style={{ left: '92%' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <p className="section-label mb-6">Est. {estYear} — Original Music</p>
            <h1
              className="heading-display text-[clamp(4rem,12vw,9rem)] text-arden-white mb-8 leading-none"
              style={{ letterSpacing: '-0.02em' }}
            >
              Arden
            </h1>
            <p className="text-arden-subtext text-lg max-w-xl leading-relaxed mb-12">
              {heroTagline}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/media" className="btn-primary">
                Watch <ArrowRight size={16} />
              </Link>
              <Link href="/shows" className="btn-ghost">
                See Shows
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 flex items-center gap-6 pb-24 pr-0">
            <a
              href="https://www.instagram.com/ardenjams"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <Camera size={16} />
              <span className="text-xs tracking-widest uppercase">Instagram</span>
            </a>
            <a
              href="https://youtube.com/@ardenjams"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <Play size={16} />
              <span className="text-xs tracking-widest uppercase">YouTube</span>
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT STRIP */}
      <section className="py-20 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-label mb-4">The Band</p>
            <h2 className="heading-display text-4xl md:text-5xl text-arden-white mb-6">
              Built on stage,
              <br />
              <span className="text-arden-accent">refined in the room.</span>
            </h2>
          </div>
          <div>
            <p className="text-arden-subtext leading-relaxed text-lg">{bio}</p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 mt-6 text-sm text-arden-accent hover:text-arden-white transition-colors uppercase tracking-wider"
            >
              Read More <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED VIDEO */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-3">Watch</p>
              <h2 className="heading-display text-4xl text-arden-white">Latest Videos</h2>
            </div>
            <Link
              href="/media"
              className="hidden md:flex items-center gap-2 text-sm text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider"
            >
              All Videos <ArrowRight size={14} />
            </Link>
          </div>

          {featuredVideoId ? (
            <div className="mb-8 group">
              <div className="relative aspect-video bg-arden-surface overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${featuredVideoId}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Arden - Featured Video"
                />
              </div>
            </div>
          ) : (
            <div className="mb-8 aspect-video bg-arden-surface flex items-center justify-center">
              <a href="https://youtube.com/@ardenjams" target="_blank" rel="noopener noreferrer"
                className="text-arden-accent hover:text-arden-white transition-colors text-sm tracking-wider uppercase">
                Watch on YouTube →
              </a>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/media" className="btn-ghost">
              View All Videos
            </Link>
          </div>
        </div>
      </section>

      {/* SHOWS TEASER */}
      <section className="py-20 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-3">Live</p>
              <h2 className="heading-display text-4xl text-arden-white">Upcoming Shows</h2>
            </div>
            <Link
              href="/shows"
              className="hidden md:flex items-center gap-2 text-sm text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider"
            >
              All Shows <ArrowRight size={14} />
            </Link>
          </div>

          {upcomingShows.length > 0 ? (
            <div className="space-y-px">
              {upcomingShows.map((show) => {
                const d = new Date(show.datetime)
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div
                    key={show.id}
                    className="group flex items-center justify-between py-5 px-6 bg-arden-surface hover:bg-arden-muted transition-colors cursor-pointer border-l-2 border-transparent hover:border-arden-accent"
                  >
                    <div className="flex items-center gap-8">
                      <span className="text-arden-accent font-mono text-sm w-16">{label}</span>
                      <div>
                        <p className="text-arden-white font-medium">{show.venue}</p>
                        <p className="text-arden-subtext text-sm">{show.location}</p>
                      </div>
                    </div>
                    <Link href="/shows" className="btn-ghost text-xs py-2 px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      Info
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-arden-subtext">No upcoming shows. Check back soon.</p>
          )}

          <div className="mt-6 md:hidden text-center">
            <Link href="/shows" className="btn-ghost">
              All Shows
            </Link>
          </div>
        </div>
      </section>

      {/* MERCH TEASER */}
      <section className="py-20 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-3">Store</p>
              <h2 className="heading-display text-4xl text-arden-white">Merch</h2>
            </div>
            <Link
              href="/merch"
              className="hidden md:flex items-center gap-2 text-sm text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider"
            >
              Shop All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Classic Tee', price: '$28', color: 'bg-arden-surface' },
              { name: 'Arden Cap', price: '$24', color: 'bg-arden-muted' },
              { name: 'Hoodie', price: '$55', color: 'bg-arden-surface' },
              { name: 'Vinyl', price: '$32', color: 'bg-arden-muted' },
            ].map((item, i) => (
              <Link key={i} href="/merch" className="group">
                <div className={`aspect-square ${item.color} flex items-center justify-center mb-3 overflow-hidden`}>
                  <div className="w-16 h-16 border border-arden-border opacity-30 group-hover:opacity-60 transition-opacity" />
                </div>
                <p className="text-sm font-medium text-arden-text group-hover:text-arden-accent transition-colors">
                  {item.name}
                </p>
                <p className="text-xs text-arden-subtext">{item.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAN LIST */}
      <section className="py-20 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl">
            <p className="section-label mb-3">Stay Connected</p>
            <h2 className="heading-display text-4xl text-arden-white mb-4">Get Updates</h2>
            <p className="text-arden-subtext text-sm mb-8 leading-relaxed">
              New shows, releases, and merch drops — straight to your inbox.
            </p>
            <SubscribeForm />
          </div>
        </div>
      </section>
    </div>
  )
}
