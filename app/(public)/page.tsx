import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, ChevronDown } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import { getVisibility } from '@/lib/visibility'
import { getMergedVideos } from '@/lib/youtube'
import SubscribeForm from '@/components/SubscribeForm'
import LiteYouTube from '@/components/LiteYouTube'
import HeroParallax from '@/components/HeroParallax'
import { SoundCloudIcon, YouTubeIcon, InstagramIcon } from '@/components/BrandIcons'

export const dynamic = 'force-dynamic'

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}


async function getMerchTeaser(limit = 4) {
  try {
    const snap = await adminDb.collection('merch').orderBy('createdAt', 'desc').limit(limit).get()
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as { name: string; price: number; imageUrl?: string }) }))
  } catch {
    return []
  }
}

async function getUpcomingShows(limit = 3) {
  try {
    const snap = await adminDb.collection('shows').get()
    const now = new Date()
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as { id: string; datetime: string; venue: string; location: string; isPublic: boolean })
      .filter(s => s.isPublic && new Date(s.datetime) > now)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      .slice(0, limit)
  } catch (err) {
    console.error('[home] Failed to fetch upcoming shows:', err)
    return []
  }
}

export default async function HomePage() {
  const [content, upcomingShows, videos, merchItems, visibility] = await Promise.all([
    getSiteContent(),
    getUpcomingShows(),
    getMergedVideos(),
    getMerchTeaser(),
    getVisibility(),
  ])

  const estYear = content.estYear || '2022'
  const heroTagline = content.heroTagline || 'Indie rock from the ground up. Raw energy, honest songs, and a sound that keeps moving.'
  const bio = content.bio || 'Arden is an indie rock band crafting original music with an honest, lived-in sound. Formed through late-night rehearsals and relentless gigging, the band brings a raw energy to every performance — equal parts careful craft and in-the-moment feeling.'
  const aboutHeading = content.aboutHeading || 'Built on stage,'
  const aboutAccent = content.aboutAccent || 'refined in the room.'
  const newsletterHeading = content.newsletterHeading || 'Get Updates'
  const newsletterDescription = content.newsletterDescription || 'New shows, releases, and merch drops — straight to your inbox.'
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const soundcloudUrl = content.soundcloudUrl || ''

  const featuredVideo = videos.find(v => v.featured) || videos[0] || null
  const recentVideos = videos.filter(v => v.youtubeId !== featuredVideo?.youtubeId).slice(0, 3)

  const nextShow = upcomingShows[0]
  const nextShowLabel = nextShow
    ? `${new Date(nextShow.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${nextShow.venue}`
    : ''

  const bandJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: 'Arden',
    description: bio,
    genre: 'Jam Band',
    foundingDate: estYear,
    url: 'https://ardenjams.netlify.app',
    sameAs: [instagramUrl, youtubeUrl, ...(soundcloudUrl ? [soundcloudUrl] : [])],
  }

  const socials = [
    { href: instagramUrl, label: 'Instagram', icon: <InstagramIcon size={16} /> },
    { href: youtubeUrl, label: 'YouTube', icon: <YouTubeIcon size={16} /> },
    ...(soundcloudUrl ? [{ href: soundcloudUrl, label: 'SoundCloud', icon: <SoundCloudIcon size={16} /> }] : []),
  ]

  return (
    <div className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bandJsonLd) }}
      />

      {/* HERO — full-bleed live shot; the photo carries the ARDEN lettering */}
      <section className="relative h-[100svh] min-h-[560px] flex items-end pb-16 md:pb-20 px-6">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <HeroParallax />
          {/* Top vignette — for nav readability */}
          <div
            className="absolute inset-x-0 top-0 h-28"
            style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0.55), transparent)' }}
          />
          {/* Bottom fade — kept low so the photo stays the star */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 52%, rgba(10,10,10,0.45) 68%, rgba(10,10,10,0.82) 84%, #0a0a0a 97%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-3xl">
            <p
              className="hero-enter text-arden-accent font-semibold uppercase tracking-[0.35em] text-sm md:text-lg mb-3"
            >
              Est. {estYear}
            </p>
            <h1
              className="hero-enter heading-display text-[clamp(2.75rem,7vw,5rem)] text-arden-white mb-4 leading-none"
              style={{ letterSpacing: '-0.02em', animationDelay: '0.1s' }}
            >
              Arden
            </h1>
            <p
              className="hero-enter text-arden-subtext text-base md:text-lg max-w-xl leading-relaxed mb-6"
              style={{ animationDelay: '0.2s' }}
            >
              {heroTagline}
            </p>

            {nextShow && (
              <div className="hero-enter mb-6" style={{ animationDelay: '0.25s' }}>
                <Link
                  href="/shows"
                  className="group inline-flex items-center gap-3 border border-arden-accent bg-arden-black/75 backdrop-blur-sm px-5 py-3 text-sm font-semibold tracking-wider uppercase text-arden-accent transition-all duration-200 hover:bg-arden-accent hover:text-arden-black focus-visible:bg-arden-accent focus-visible:text-arden-black active:scale-[0.98]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                  </span>
                  Next show · {nextShowLabel}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}

            <div className="hero-enter flex flex-wrap items-center gap-4 mb-6" style={{ animationDelay: '0.3s' }}>
              {visibility.media && (
                <Link href="/media" className="btn-primary">
                  Watch <ArrowRight size={16} />
                </Link>
              )}
              {visibility.shows && (
                <Link href="/shows" className="btn-ghost">
                  See Shows
                </Link>
              )}
            </div>

            <div className="hero-enter flex items-center gap-6" style={{ animationDelay: '0.4s' }}>
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors"
                >
                  {s.icon}
                  <span className="text-xs tracking-widest uppercase">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 hidden md:block">
          <ChevronDown size={20} className="text-arden-subtext animate-scroll-cue" />
        </div>
      </section>

      {/* ABOUT STRIP */}
      <section className="py-20 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-label mb-4">The Band</p>
            <h2 className="heading-display text-4xl md:text-5xl text-arden-white mb-6">
              {aboutHeading}
              <br />
              <span className="text-arden-accent">{aboutAccent}</span>
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

      {/* VIDEOS */}
      {visibility.media && featuredVideo && (
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

            <div className="mb-8">
              <div className="relative aspect-video bg-arden-surface overflow-hidden">
                <LiteYouTube videoId={featuredVideo.youtubeId} title={featuredVideo.title || 'Arden — Featured Video'} />
              </div>
            </div>

            {recentVideos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {recentVideos.map(v => (
                  <div key={v.youtubeId}>
                    <div className="relative aspect-video bg-arden-surface overflow-hidden">
                      <LiteYouTube videoId={v.youtubeId} title={v.title} />
                    </div>
                    <p className="mt-2 text-sm text-arden-subtext truncate">{v.title}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-4">
              <Link href="/media" className="btn-ghost">
                View All Videos
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SHOWS TEASER */}
      {visibility.shows && (
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
              <>
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
                <div className="mt-6 md:hidden text-center">
                  <Link href="/shows" className="btn-ghost">
                    All Shows
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-arden-surface border border-arden-border p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-arden-white text-lg font-medium mb-1">Nothing on the books — yet.</p>
                  <p className="text-arden-subtext text-sm">
                    Want Arden at your venue, party, or backyard? We travel well.
                  </p>
                </div>
                <Link href="/about#contact" className="btn-primary flex-shrink-0 self-start md:self-auto">
                  Book the Band <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MERCH TEASER */}
      {visibility.merch && merchItems.length > 0 && (
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
              {merchItems.map((item, i) => (
                <Link key={item.id} href="/merch" className="group">
                  <div className={`relative aspect-square ${i % 2 === 0 ? 'bg-arden-surface' : 'bg-arden-muted'} flex items-center justify-center mb-3 overflow-hidden`}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-16 h-16 border border-arden-border opacity-30 group-hover:opacity-60 transition-opacity" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-arden-text group-hover:text-arden-accent transition-colors">
                    {item.name}
                  </p>
                  <p className="text-xs text-arden-subtext">${item.price}</p>
                </Link>
              ))}
            </div>

            <div className="mt-6 md:hidden text-center">
              <Link href="/merch" className="btn-ghost">
                Shop All
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAN LIST */}
      {visibility.fanlist && (
        <section id="updates" className="py-20 px-6 border-t border-arden-border scroll-mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="bg-arden-surface border border-arden-border p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <p className="section-label mb-3">Stay Connected</p>
                  <h2 className="heading-display text-4xl text-arden-white mb-4">{newsletterHeading}</h2>
                  <p className="text-arden-subtext text-sm leading-relaxed">
                    {newsletterDescription}
                  </p>
                </div>
                <div>
                  <SubscribeForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
