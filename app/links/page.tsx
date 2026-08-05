import Link from 'next/link'
import { getVisibility } from '@/lib/visibility'
import { getSiteContent } from '@/lib/site-content'
import { SoundCloudIcon, YouTubeIcon, InstagramIcon } from '@/components/BrandIcons'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Arden — Links',
  description: 'Listen, watch, and follow Arden — Long Island jam band.',
}

interface BioLink {
  href: string
  label: string
  sub?: string
  icon?: React.ReactNode
  external?: boolean
}

export default async function LinksPage() {
  const [content, visibility] = await Promise.all([getSiteContent(), getVisibility()])

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
    ...(visibility.shows ? [{ href: '/shows', label: 'Shows', sub: 'Upcoming dates & tickets' }] : []),
    ...(visibility.media ? [{ href: '/media', label: 'Watch', sub: 'Live videos & sessions' }] : []),
    ...(visibility.fanlist ? [{ href: '/#updates', label: 'Join the Fan List', sub: 'Shows & releases in your inbox' }] : []),
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
