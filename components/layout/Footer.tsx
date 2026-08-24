import Link from 'next/link'
import { getVisibility } from '@/lib/visibility'
import { getSiteContent } from '@/lib/site-content'
import { SoundCloudIcon, YouTubeIcon, InstagramIcon } from '@/components/BrandIcons'

export default async function Footer() {
  const [content, visibility] = await Promise.all([getSiteContent(), getVisibility()])
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const soundcloudUrl = content.soundcloudUrl || ''

  const footerLinks = [
    ...(visibility.media ? [{ href: '/media', label: 'Media' }] : []),
    ...(visibility.shows ? [{ href: '/shows', label: 'Shows' }] : []),
    ...(visibility.merch ? [{ href: '/merch', label: 'Merch' }] : []),
    { href: '/about', label: 'About' },
    { href: '/links', label: 'Links' },
  ]

  return (
    <footer className="border-t border-arden-border mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-display text-lg font-bold tracking-widest text-arden-white">
              ARDEN
            </span>
            <p className="text-arden-subtext text-xs mt-1 tracking-wider">
              © {new Date().getFullYear()} Arden. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={instagramUrl}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label="Arden on Instagram"
              className="flex items-center justify-center w-11 h-11 -m-2.5 text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <InstagramIcon size={18} />
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label="Arden on YouTube"
              className="flex items-center justify-center w-11 h-11 -m-2.5 text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <YouTubeIcon size={18} />
            </a>
            {soundcloudUrl && (
              <a
                href={soundcloudUrl}
                target="_blank"
                rel="me noopener noreferrer"
                aria-label="Arden on SoundCloud"
                className="flex items-center justify-center w-11 h-11 -m-2.5 text-arden-subtext hover:text-arden-accent transition-colors"
              >
                <SoundCloudIcon size={18} />
              </a>
            )}
          </div>

          <nav className="flex items-center gap-6 text-xs tracking-wider uppercase text-arden-subtext">
            {footerLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center min-h-[44px] hover:text-arden-text transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
