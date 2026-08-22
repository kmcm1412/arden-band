'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { db } from '@/lib/firebase/client'
import { parseShowDate } from '@/lib/utils'
import { collection, getDocs } from 'firebase/firestore'
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
  const [quickStats, setQuickStats] = useState<{ played: number; upcoming: number } | null>(null)

  useEffect(() => {
    if (!membership?.active) return
    getDocs(collection(db, 'shows'))
      .then(snap => {
        const now = new Date()
        const shows = snap.docs
          .map(d => d.data() as { datetime?: string; status?: string })
          .filter(s => s.datetime && s.status !== 'cancelled')
        setQuickStats({
          played: shows.filter(s => parseShowDate(s.datetime) <= now).length,
          upcoming: shows.filter(s => parseShowDate(s.datetime) > now).length,
        })
      })
      .catch(() => {})
  }, [membership])

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Band Portal</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">
          Welcome back{membership?.displayName ? `, ${membership.displayName}` : ''}.
        </h1>
      </div>

      {quickStats && (
        <Link
          href="/dashboard/history"
          className="group flex items-center gap-8 mb-8 p-4 bg-arden-surface border border-arden-border hover:border-arden-muted transition-colors"
        >
          <div>
            <p className="text-arden-white font-display font-bold text-2xl leading-none">{quickStats.played}</p>
            <p className="text-arden-subtext text-xs tracking-wider uppercase mt-1">Shows played</p>
          </div>
          <div>
            <p className="text-arden-white font-display font-bold text-2xl leading-none">{quickStats.upcoming}</p>
            <p className="text-arden-subtext text-xs tracking-wider uppercase mt-1">Upcoming</p>
          </div>
          <span className="ml-auto flex items-center gap-2 text-xs text-arden-subtext group-hover:text-arden-accent transition-colors uppercase tracking-wider">
            History &amp; Stats <ArrowRight size={14} />
          </span>
        </Link>
      )}

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
