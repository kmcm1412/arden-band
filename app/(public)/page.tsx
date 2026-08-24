import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, ChevronDown } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import { parseShowDate, formatInEastern } from '@/lib/utils'
import { getVisibility } from '@/lib/visibility'
import { getMergedVideos } from '@/lib/youtube'
import { getSiteContent } from '@/lib/site-content'
import { SITE_URL } from '@/lib/site'
import { fmtMoney } from '@/lib/utils'
import SubscribeForm from '@/components/SubscribeForm'
import LiteYouTube from '@/components/LiteYouTube'
import HeroParallax from '@/components/HeroParallax'
import { SoundCloudIcon, YouTubeIcon, InstagramIcon } from '@/components/BrandIcons'

export const dynamic = 'force-dynamic'

async function getMerchTeaser(limit = 4) {
  try {
    // Over-fetch then filter: only available items belong on the homepage,
    // and an availability where-clause would need a composite index
    const snap = await adminDb.collection('merch').orderBy('createdAt', 'desc').limit(limit * 3).get()
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as { name: string; price: number; imageUrl?: string; available?: boolean }) }))
      .filter(item => item.available !== false)
      .slice(0, limit)
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
      .filter(s => s.isPublic && parseShowDate(s.datetime) > now)
      .sort((a, b) => parseShowDate(a.datetime).getTime() - parseShowDate(b.datetime).getTime())
      .slice(0, limit)
  } catch (err) {
    console.error('[home] Failed to fetch upcoming shows:', err)
    return []
  }
}

function HeroContent({
  estYear,
  heroTagline,
  nextShow,
  nextShowLabel,
  visibility,
  socials,
  isPrimary = false,
}: {
  estYear: string
  heroTagline: string
  nextShow: boolean
  nextShowLabel: string
  visibility: { media: boolean; shows: boolean }
  socials: { href: string; label: string; icon: React.ReactNode }[]
  /** Only one hero variant should own the page's h1 — the other renders a plain element */
  isPrimary?: boolean
}) {
  const Title = isPrimary ? 'h1' : 'p'
  return (
    <>
      {/* Title lockup — Est. year sits big and gold on the baseline */}
      <div className="hero-enter flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-4">
        <Title
          aria-hidden={!isPrimary}
          className="heading-display text-[clamp(3rem,7vw,5rem)] text-arden-white leading-none"
          style={{ letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.85)' }}
        >
          Arden
        </Title>
        <span className="flex items-baseline gap-3">
          <span className="hidden sm:block w-10 h-px bg-arden-accent self-center" aria-hidden="true" />
          <span
            className="font-display text-arden-accent font-bold uppercase tracking-[0.2em] text-xl md:text-2xl"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
          >
            Est. {estYear}
          </span>
        </span>
      </div>
      <p
        className="hero-enter text-arden-text text-base md:text-lg max-w-xl leading-relaxed mb-6 font-medium"
        style={{ animationDelay: '0.15s', textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}
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
            rel="me noopener noreferrer"
            className="group flex items-center gap-2 py-2.5 -my-2.5 text-arden-subtext hover:text-arden-accent transition-colors"
          >
            {s.icon}
            <span className="text-xs tracking-widest uppercase">{s.label}</span>
          </a>
        ))}
      </div>
    </>
  )
}

export default async function HomePage() {
  const [content, upcomingShows, videos, merchItems, visibility] = await Promise.all([
    getSiteContent(),
    getUpcomingShows(),
    getMergedVideos(),
    getMerchTeaser(),
    getVisibility(),
  ])

  const estYear = content.estYear || '2025'
  const heroTagline = content.heroTagline || 'Long Island-based jam band. Loose, live, and never the same show twice.'
  const bio = content.bio || 'Arden is a Long Island jam band blending improvisation with songs you know and songs you will. Formed through late-night rehearsals and relentless gigging, the band brings raw energy to every performance — equal parts careful craft and in-the-moment feeling.'
  const aboutHeading = content.aboutHeading || 'Built on stage,'
  const aboutAccent = content.aboutAccent || 'refined in the room.'
  const newsletterHeading = content.newsletterHeading || 'Get Updates'
  const newsletterDescription = content.newsletterDescription || 'New shows, releases, and merch drops — straight to your inbox.'
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const soundcloudUrl = content.soundcloudUrl || ''

  const longform = videos.filter(v => !v.isShort)
  const featuredVideo = longform.find(v => v.featured) || longform[0] || null
  const recentVideos = longform.filter(v => v.youtubeId !== featuredVideo?.youtubeId).slice(0, 3)

  const nextShow = upcomingShows[0]
  const nextShowLabel = nextShow
    ? `${formatInEastern(nextShow.datetime, { month: 'short', day: 'numeric' })} · ${nextShow.venue}`
    : ''

  const bandJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: 'Arden',
    description: bio,
    genre: 'Jam Band',
    foundingDate: estYear,
    url: SITE_URL,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bandJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* HERO — the photo carries the ARDEN lettering.
          Mobile: full uncropped image, content below.
          Desktop: overlay layout at ~78% viewport so the page starts sooner. */}
      <section className="relative">
        {/* ── Mobile ── */}
        <div className="md:hidden">
          <div className="relative">
            <img
              src="/hero-1280.jpg"
              alt="Arden performing live — the band on stage under neon ARDEN lettering"
              fetchPriority="high"
              className="w-full h-auto"
            />
            {/* Blend the image bottom into the page background */}
            <div
              className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: 'linear-gradient(to bottom, transparent, #0a0a0a)' }}
            />
          </div>
          <div className="px-6 pt-2 pb-12">
            <HeroContent
              estYear={estYear}
              heroTagline={heroTagline}
              nextShow={!!nextShow}
              nextShowLabel={nextShowLabel}
              visibility={visibility}
              socials={socials}
              isPrimary
            />
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="hidden md:flex relative h-[78svh] min-h-[560px] items-end pb-14 px-6">
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
                background: 'linear-gradient(to bottom, transparent 48%, rgba(10,10,10,0.5) 64%, rgba(10,10,10,0.85) 82%, #0a0a0a 97%)',
              }}
            />
            {/* Text-corner scrim — guarantees legibility when a short viewport
                crops the photo so its bright center lands behind the text */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 55% 60% at 14% 92%, rgba(10,10,10,0.8) 0%, rgba(10,10,10,0.45) 55%, transparent 78%)',
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full">
            <div className="max-w-3xl">
              <HeroContent
                estYear={estYear}
                heroTagline={heroTagline}
                nextShow={!!nextShow}
                nextShowLabel={nextShowLabel}
                visibility={visibility}
                socials={socials}
              />
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <ChevronDown size={20} className="text-arden-subtext animate-scroll-cue" />
          </div>
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
            <p className="text-arden-text leading-relaxed text-lg">{bio}</p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 mt-6 py-2.5 -my-2.5 text-sm text-arden-accent hover:text-arden-white transition-colors uppercase tracking-wider"
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
                className="flex items-center gap-2 py-2.5 -my-2.5 text-sm text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider flex-shrink-0"
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
                    const label = formatInEastern(show.datetime, { month: 'short', day: 'numeric' })
                    return (
                      <Link
                        key={show.id}
                        href="/shows"
                        className="group flex items-center justify-between py-5 px-6 bg-arden-surface hover:bg-arden-muted transition-colors border-l-2 border-transparent hover:border-arden-accent"
                      >
                        <div className="flex items-center gap-8">
                          <span className="text-arden-accent font-mono text-sm w-16">{label}</span>
                          <div>
                            <p className="text-arden-white font-medium">{show.venue}</p>
                            <p className="text-arden-subtext text-sm">{show.location}</p>
                          </div>
                        </div>
                        <span className="text-xs tracking-wider uppercase text-arden-subtext group-hover:text-arden-accent transition-colors flex items-center gap-1.5">
                          Tickets &amp; Info <ArrowRight size={12} />
                        </span>
                      </Link>
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
              <div className="py-10 text-center border border-dashed border-arden-border">
                <p className="text-arden-white font-medium mb-1">Nothing on the books — yet.</p>
                <p className="text-arden-subtext text-sm">
                  Join the{' '}
                  <a href="#updates" className="text-arden-accent hover:text-arden-white transition-colors">
                    fan list
                  </a>{' '}
                  and be first to hear when we announce the next one.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* LISTEN — embedded SoundCloud player so visitors can hear the band without leaving */}
      {soundcloudUrl && (
        <section className="py-20 px-6 border-t border-arden-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="section-label mb-3">Listen</p>
                <h2 className="heading-display text-4xl text-arden-white">On SoundCloud</h2>
              </div>
              <a
                href={soundcloudUrl}
                target="_blank"
                rel="me noopener noreferrer"
                className="flex items-center gap-2 py-2.5 -my-2.5 text-sm text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider flex-shrink-0"
              >
                Full Profile <ArrowRight size={14} />
              </a>
            </div>
            <div className="bg-arden-surface border border-arden-border p-2">
              <iframe
                title="Arden on SoundCloud"
                width="100%"
                height="400"
                loading="lazy"
                allow="autoplay"
                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudUrl)}&color=%23c8a96e&auto_play=false&show_user=true&show_reposts=false&visual=false`}
              />
            </div>
          </div>
        </section>
      )}

      {/* BOOKING CTA — always visible, not just when the calendar is empty */}
      <section className="py-14 px-6 border-t border-arden-border">
        <div className="max-w-7xl mx-auto">
          <div className="bg-arden-surface border border-arden-border p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="section-label mb-2">Bookings</p>
              <p className="text-arden-white text-lg font-medium mb-1">Want Arden at your venue, party, or backyard?</p>
              <p className="text-arden-subtext text-sm">Bars, breweries, private events — we travel well and read the room.</p>
            </div>
            <Link href="/about#contact" className="btn-primary flex-shrink-0 self-start md:self-auto">
              Book the Band <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

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
                  <p className="text-xs text-arden-subtext">{fmtMoney(item.price)}</p>
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
