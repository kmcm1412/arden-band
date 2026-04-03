'use client'

import { useAuth } from '@/lib/auth/context'
import { Music, Calendar, ListMusic, Users, Megaphone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const cards = [
  {
    href: '/dashboard/availability',
    icon: Calendar,
    label: 'Availability',
    desc: 'Submit and view member schedules',
    color: 'text-blue-400',
  },
  {
    href: '/dashboard/shows',
    icon: Music,
    label: 'Shows',
    desc: 'Manage upcoming performances',
    color: 'text-arden-accent',
  },
  {
    href: '/dashboard/setlists',
    icon: ListMusic,
    label: 'Set Lists',
    desc: 'Build and organize set lists',
    color: 'text-green-400',
  },
  {
    href: '/dashboard/opportunities',
    icon: Megaphone,
    label: 'Opportunities',
    desc: 'Track venues and outreach',
    color: 'text-purple-400',
  },
]

export default function DashboardOverview() {
  const { membership } = useAuth()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Band Portal</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">
          Welcome back{membership?.displayName ? `, ${membership.displayName}` : ''}.
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group p-5 bg-arden-surface border border-arden-border hover:border-arden-muted transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <card.icon size={20} className={card.color} />
              <ArrowRight size={16} className="text-arden-border group-hover:text-arden-subtext group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-medium text-arden-white mb-1">{card.label}</h3>
            <p className="text-sm text-arden-subtext">{card.desc}</p>
          </Link>
        ))}
      </div>

      {membership?.role === 'admin' && (
        <div className="p-5 bg-arden-surface border border-arden-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-arden-accent" />
              <span className="font-medium text-arden-white text-sm">Access Management</span>
            </div>
            <Link
              href="/dashboard/access"
              className="text-xs text-arden-subtext hover:text-arden-accent transition-colors flex items-center gap-1"
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <p className="text-xs text-arden-subtext">Admin-only: manage who can access the band portal.</p>
        </div>
      )}
    </div>
  )
}
