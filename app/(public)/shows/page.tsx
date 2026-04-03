import Link from 'next/link'
import { MapPin, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Shows — Arden' }

const SHOWS = [
  {
    id: '1',
    date: '2025-05-10T20:00:00',
    venue: 'The Foundry',
    location: 'Philadelphia, PA',
    ticketLink: 'https://ticketmaster.com',
    status: 'confirmed',
  },
  {
    id: '2',
    date: '2025-05-17T21:00:00',
    venue: 'Rockwood Music Hall',
    location: 'New York, NY',
    ticketLink: 'https://ticketmaster.com',
    status: 'confirmed',
  },
  {
    id: '3',
    date: '2025-05-24T20:30:00',
    venue: 'The Sinclair',
    location: 'Cambridge, MA',
    ticketLink: 'https://ticketmaster.com',
    status: 'confirmed',
  },
  {
    id: '4',
    date: '2025-06-07T20:00:00',
    venue: 'Johnny Brenda\'s',
    location: 'Philadelphia, PA',
    ticketLink: null,
    status: 'pending',
  },
  {
    id: '5',
    date: '2025-06-21T21:00:00',
    venue: 'Baby\'s All Right',
    location: 'Brooklyn, NY',
    ticketLink: null,
    status: 'pending',
  },
]

function formatShowDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate().toString().padStart(2, '0'),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    full: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

export default function ShowsPage() {
  const upcoming = SHOWS.filter(s => new Date(s.date) > new Date())
  const past = SHOWS.filter(s => new Date(s.date) <= new Date())

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">Live</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Shows</h1>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-4 mb-20">
            {upcoming.map((show) => {
              const d = formatShowDate(show.date)
              return (
                <div
                  key={show.id}
                  className="group relative flex items-stretch gap-0 bg-arden-surface hover:bg-arden-muted transition-all duration-200 overflow-hidden"
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 w-20 flex flex-col items-center justify-center bg-arden-muted group-hover:bg-arden-accent transition-colors py-6">
                    <span className="text-xs font-mono tracking-widest text-arden-subtext group-hover:text-arden-black transition-colors">
                      {d.month}
                    </span>
                    <span className="text-3xl font-display font-bold text-arden-white group-hover:text-arden-black leading-none transition-colors">
                      {d.day}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-6 py-5 flex items-center justify-between gap-4">
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

                    {show.ticketLink && (
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
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-arden-subtext text-lg">No upcoming shows announced.</p>
            <p className="text-arden-subtext text-sm mt-2">Follow us on Instagram for updates.</p>
          </div>
        )}

        <div className="border-t border-arden-border pt-12">
          <p className="text-arden-subtext text-sm tracking-wider uppercase mb-2">Stay Updated</p>
          <p className="text-arden-text">
            Follow{' '}
            <a
              href="https://www.instagram.com/ardenjams"
              target="_blank"
              rel="noopener noreferrer"
              className="text-arden-accent hover:text-arden-white transition-colors"
            >
              @ardenjams
            </a>{' '}
            on Instagram for show announcements.
          </p>
        </div>
      </div>
    </div>
  )
}
