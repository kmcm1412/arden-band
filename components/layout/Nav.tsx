'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SectionVisibility } from '@/lib/visibility'

export default function Nav({ visibility }: { visibility: SectionVisibility }) {
  const navLinks = [
    { href: '/', label: 'Home' },
    ...(visibility.media ? [{ href: '/media', label: 'Media' }] : []),
    ...(visibility.shows ? [{ href: '/shows', label: 'Shows' }] : []),
    ...(visibility.merch ? [{ href: '/merch', label: 'Merch' }] : []),
    { href: '/about', label: 'About' },
    { href: '/about#contact', label: 'Book Us' },
  ]
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-arden-black/95 backdrop-blur-sm border-b border-arden-border'
          : ''
      )}
      style={
        scrolled
          ? undefined
          : { background: 'linear-gradient(to bottom, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.55) 70%, transparent 100%)' }
      }
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-widest text-arden-white hover:text-arden-accent transition-colors"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
        >
          ARDEN
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'text-sm font-medium tracking-wider uppercase transition-colors duration-200',
                  pathname === link.href.split('#')[0]
                    ? 'text-arden-accent'
                    : 'text-arden-text/90 hover:text-arden-white'
                )}
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden text-arden-text flex items-center justify-center w-11 h-11 -mr-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-arden-dark border-t border-arden-border">
          <ul className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'text-sm font-medium tracking-wider uppercase',
                    pathname === link.href.split('#')[0] ? 'text-arden-accent' : 'text-arden-subtext'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
