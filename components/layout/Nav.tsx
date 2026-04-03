'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/media', label: 'Media' },
  { href: '/shows', label: 'Shows' },
  { href: '/merch', label: 'Merch' },
  { href: '/about', label: 'About' },
]

export default function Nav() {
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
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-widest text-arden-white hover:text-arden-accent transition-colors"
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
                  pathname === link.href
                    ? 'text-arden-accent'
                    : 'text-arden-subtext hover:text-arden-text'
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Link href="/dashboard" className="btn-ghost text-xs py-2 px-4">
            Band Portal
          </Link>
        </div>

        <button
          className="md:hidden text-arden-text p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
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
                    pathname === link.href ? 'text-arden-accent' : 'text-arden-subtext'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/dashboard" className="text-sm font-medium tracking-wider uppercase text-arden-subtext">
                Band Portal
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
