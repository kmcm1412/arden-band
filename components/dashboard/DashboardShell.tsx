'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useAuth } from '@/lib/auth/context'
import {
  Calendar,
  Music,
  ListMusic,
  LayoutDashboard,
  Users,
  Megaphone,
  Menu,
  X,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/availability', label: 'Availability', icon: Calendar },
  { href: '/dashboard/shows', label: 'Shows', icon: Music },
  { href: '/dashboard/setlists', label: 'Set Lists', icon: ListMusic },
  { href: '/dashboard/content', label: 'Content', icon: LayoutDashboard },
  { href: '/dashboard/opportunities', label: 'Opportunities', icon: Megaphone },
]

const adminItems = [
  { href: '/dashboard/access', label: 'Access', icon: Users },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, membership } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut(auth)
    router.push('/')
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-arden-border">
        <Link href="/" className="font-display text-lg font-bold tracking-widest text-arden-white hover:text-arden-accent transition-colors">
          ARDEN
        </Link>
        <p className="text-xs text-arden-subtext mt-0.5 tracking-wider">Band Portal</p>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150',
              isActive(item.href, item.exact)
                ? 'bg-arden-muted text-arden-accent'
                : 'text-arden-subtext hover:text-arden-text hover:bg-arden-surface'
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}

        {membership?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs tracking-widest uppercase text-arden-subtext/50">Admin</p>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150',
                  isActive(item.href)
                    ? 'bg-arden-muted text-arden-accent'
                    : 'text-arden-subtext hover:text-arden-text hover:bg-arden-surface'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-arden-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-arden-text truncate">{user?.email}</p>
          <p className="text-xs text-arden-subtext capitalize">{membership?.role?.replace('_', ' ')}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-arden-subtext hover:text-arden-text transition-colors border border-arden-border hover:border-arden-muted"
          >
            <ExternalLink size={12} />
            Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-arden-subtext hover:text-red-400 transition-colors border border-arden-border hover:border-red-900"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-arden-black overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-arden-dark border-r border-arden-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-arden-dark border-r border-arden-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-arden-border bg-arden-dark">
          <button onClick={() => setSidebarOpen(true)} className="text-arden-text p-1">
            <Menu size={20} />
          </button>
          <span className="font-display font-bold tracking-widest text-arden-white">ARDEN</span>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
