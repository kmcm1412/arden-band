import Link from 'next/link'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Arden — Links',
  description: 'Listen, watch, and follow Arden — Long Island jam band.',
}

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function SoundCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M11.4 8.2c-.3 0-.5.1-.8.2-.2-2.6-2.3-4.6-5-4.6-.7 0-1.3.1-1.9.4-.2.1-.3.2-.3.4V16c0 .2.2.4.4.4h7.6c1.5 0 2.7-1.2 2.7-2.7s-1.2-2.7-2.7-2.7v-2.8zm2.9 8.2h5.1c2 0 3.6-1.6 3.6-3.6s-1.6-3.6-3.6-3.6c-.4 0-.8.1-1.2.2C17.8 6.7 15.6 4.8 13 4.8c-.4 0-.9.1-1.3.2-.2.1-.3.2-.3.4v10.6c0 .2.2.4.4.4h2.5zM.6 10.2c-.1 0-.2.1-.2.2l-.4 2.6.4 2.6c0 .1.1.2.2.2s.2-.1.2-.2l.5-2.6-.5-2.6c0-.1-.1-.2-.2-.2zm2-1.4c-.1 0-.2.1-.2.2L2 13l.4 2.9c0 .1.1.2.2.2s.2-.1.2-.2l.5-2.9-.5-3c0-.1-.1-.2-.2-.2zm2.1-.7c-.2 0-.3.1-.3.3L4 13l.4 3.5c0 .2.1.3.3.3.1 0 .3-.1.3-.3L5.4 13 5 8.4c0-.2-.2-.3-.3-.3z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.8" cy="6.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

interface BioLink {
  href: string
  label: string
  sub?: string
  icon?: React.ReactNode
  external?: boolean
}

export default async function LinksPage() {
  const content = await getSiteContent()

  const tagline = content.linksTagline || content.heroTagline || 'Long Island-based Jam Band'
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const soundcloudUrl = content.soundcloudUrl || ''
  const instagramHandle = content.instagramHandle || '@ardenjams'
  const youtubeHandle = content.youtubeHandle || '@ardenjams'
  const aboutImage = content.aboutImage || ''

  const links: BioLink[] = [
    ...(soundcloudUrl
      ? [{ href: soundcloudUrl, label: 'SoundCloud', sub: 'Listen to our music', icon: <SoundCloudIcon />, external: true }]
      : []),
    { href: youtubeUrl, label: 'YouTube', sub: youtubeHandle, icon: <YouTubeIcon />, external: true },
    { href: instagramUrl, label: 'Instagram', sub: instagramHandle, icon: <InstagramIcon />, external: true },
    { href: '/shows', label: 'Shows', sub: 'Upcoming dates & tickets' },
    { href: '/media', label: 'Watch', sub: 'Live videos & sessions' },
    { href: '/#updates', label: 'Join the Fan List', sub: 'Shows & releases in your inbox' },
  ]

  return (
    <div className="min-h-screen bg-arden-black flex flex-col items-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-arden-accent mb-6 bg-arden-surface flex items-center justify-center">
          {aboutImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={aboutImage} alt="Arden" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-4xl text-arden-accent">A</span>
          )}
        </div>

        <h1 className="font-display text-4xl font-bold tracking-widest text-arden-white mb-2">
          ARDEN
        </h1>
        <p className="text-arden-subtext text-sm text-center mb-10 max-w-xs leading-relaxed">
          {tagline}
        </p>

        {/* Links */}
        <div className="w-full space-y-3">
          {links.map(link =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 w-full bg-arden-surface border border-arden-border hover:border-arden-accent px-5 py-4 transition-all duration-200 hover:bg-arden-muted"
              >
                <span className="text-arden-accent flex-shrink-0">{link.icon}</span>
                <span className="flex-1 text-left">
                  <span className="block text-arden-white font-medium tracking-wide">{link.label}</span>
                  {link.sub && <span className="block text-arden-subtext text-xs mt-0.5">{link.sub}</span>}
                </span>
                <span className="text-arden-border group-hover:text-arden-accent transition-colors">→</span>
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="group flex items-center gap-4 w-full bg-arden-surface border border-arden-border hover:border-arden-accent px-5 py-4 transition-all duration-200 hover:bg-arden-muted"
              >
                <span className="flex-1 text-left">
                  <span className="block text-arden-white font-medium tracking-wide">{link.label}</span>
                  {link.sub && <span className="block text-arden-subtext text-xs mt-0.5">{link.sub}</span>}
                </span>
                <span className="text-arden-border group-hover:text-arden-accent transition-colors">→</span>
              </Link>
            )
          )}
        </div>

        <Link
          href="/"
          className="mt-10 text-xs tracking-widest uppercase text-arden-subtext hover:text-arden-accent transition-colors"
        >
          Full Website →
        </Link>
      </div>
    </div>
  )
}
