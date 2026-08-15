import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, ExternalLink } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import { getVisibility } from '@/lib/visibility'
import { getSiteContent } from '@/lib/site-content'
import { SITE_URL } from '@/lib/site'
import VenmoTicketWidget from '@/components/VenmoTicketWidget'
import { resolveNameMode } from '@/lib/tickets'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Shows — Arden',
  description: 'Upcoming Arden shows on Long Island and beyond — dates, venues, and tickets.',
}

async function getShows() {
  try {
    const snap = await adminDb.collection('shows').get()
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as {
        id: string
        datetime: string
        venue: string
        location: string
        ticketLink: string | null
        ticketInfo: string | null
        ticketPrice: number | null
        ticketNameMode: 'none' | 'party' | 'all' | null
        ticketWidgetMode: 'full' | 'simple' | null
        ticketNamesRequired: boolean | null
        status: string
        isPublic: boolean
      })
      .filter(s => s.isPublic)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
  } catch (err) {
    console.error('[shows] Failed to fetch shows:', err)
    return []
  }
}

function formatShowDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate().toString().padStart(2, '0'),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

export default async function ShowsPage() {
  const visibility = await getVisibility()
  if (!visibility.shows) notFound()

  const [shows, content] = await Promise.all([getShows(), getSiteContent()])
  const now = new Date()
  const upcoming = shows.filter(s => new Date(s.datetime) > now)
  const past = shows.filter(s => new Date(s.datetime) <= now)
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const instagramHandle = content.instagramHandle || '@ardenjams'
  const showsEmptyMessage = content.showsEmptyMessage || 'No upcoming shows announced.'
  const showsEmptySubtext = content.showsEmptySubtext || 'Follow us on Instagram for updates.'

  const eventsJsonLd = upcoming.map(show => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: `Arden at ${show.venue}`,
    startDate: show.datetime,
    location: {
      '@type': 'Place',
      name: show.venue,
      address: show.location,
    },
    performer: { '@type': 'MusicGroup', name: 'Arden' },
    eventStatus:
      show.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    ...(show.ticketPrice && show.ticketPrice > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: show.ticketPrice,
            priceCurrency: 'USD',
            url: `${SITE_URL}/shows`,
            availability: 'https://schema.org/InStock',
          },
        }
      : show.ticketLink
        ? { offers: { '@type': 'Offer', url: show.ticketLink } }
        : {}),
  }))

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        {eventsJsonLd.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd).replace(/</g, '\\u003c') }}
          />
        )}
        <div className="mb-16">
          <p className="section-label mb-3">Live</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Shows</h1>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-4 mb-20">
            {upcoming.map((show) => {
              const d = formatShowDate(show.datetime)
              return (
                <div
                  key={show.id}
                  className="group relative flex items-stretch gap-0 bg-arden-surface hover:bg-arden-muted transition-all duration-200 overflow-hidden"
                >
                  <div className="flex-shrink-0 w-20 flex flex-col items-center justify-center bg-arden-muted group-hover:bg-arden-accent transition-colors py-6">
                    <span className="text-xs font-mono tracking-widest text-arden-subtext group-hover:text-arden-black transition-colors">
                      {d.month}
                    </span>
                    <span className="text-3xl font-display font-bold text-arden-white group-hover:text-arden-black leading-none transition-colors">
                      {d.day}
                    </span>
                  </div>

                  <div className="flex-1 px-6 py-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-medium text-arden-white">{show.venue}</h3>
                          {show.status === 'pending' && (
                            <span className="text-xs tracking-wider uppercase text-arden-subtext border border-arden-border px-2 py-0.5">
                              TBC
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-arden-subtext text-sm">
                          <MapPin size={12} />
                          <span>{show.location}</span>
                          <span className="text-arden-border">·</span>
                          <span>{d.time}</span>
                        </div>
                      </div>

                      {/* Generic ticket button only when the Venmo widget isn't handling tickets */}
                      {show.ticketLink && !(show.ticketPrice && show.ticketPrice > 0) && (
                        <a
                          href={show.ticketLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-2 px-5 flex-shrink-0"
                        >
                          Tickets <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {show.ticketPrice && show.ticketPrice > 0 ? (
                      <VenmoTicketWidget
                        showId={show.id}
                        price={show.ticketPrice}
                        nameMode={resolveNameMode(show)}
                        venue={show.venue}
                        simple={show.ticketWidgetMode === 'simple'}
                      />
                    ) : (
                      show.ticketInfo && (
                        <p className="text-sm text-arden-text bg-arden-black/40 border-l-2 border-arden-accent px-4 py-2.5 leading-relaxed">
                          <span className="text-arden-accent text-xs tracking-widest uppercase mr-2">Tickets</span>
                          {show.ticketInfo}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-arden-subtext text-lg">{showsEmptyMessage}</p>
            <p className="text-arden-subtext text-sm mt-2">{showsEmptySubtext}</p>
          </div>
        )}

        {past.length > 0 && (
          <div className="border-t border-arden-border pt-12 mb-12">
            <p className="text-arden-subtext text-xs tracking-wider uppercase mb-6">Past Shows</p>
            <div className="space-y-2">
              {past.map((show) => {
                const d = formatShowDate(show.datetime)
                return (
                  <div key={show.id} className="flex items-center gap-6 py-3 opacity-60">
                    <span className="text-arden-subtext font-mono text-sm w-28 flex-shrink-0">
                      {d.month} {d.day}, {new Date(show.datetime).getFullYear()}
                    </span>
                    <span className="text-arden-text">{show.venue}</span>
                    <span className="text-arden-subtext text-sm">{show.location}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="border-t border-arden-border pt-12">
          <p className="text-arden-subtext text-sm tracking-wider uppercase mb-2">Stay Updated</p>
          <p className="text-arden-text">
            Follow{' '}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arden-accent hover:text-arden-white transition-colors"
            >
              {instagramHandle}
            </a>{' '}
            on Instagram for show announcements.
          </p>
        </div>
      </div>
    </div>
  )
}
