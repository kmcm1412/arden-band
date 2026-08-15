'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase/client'
import { collection, getDocs } from 'firebase/firestore'
import { Show, TicketOrder } from '@/lib/types'
import { useAuth } from '@/lib/auth/context'
import { fmtMoney } from '@/lib/utils'
import { BarChart3, ChevronRight, MapPin, Clock } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

interface ShowAggregates {
  played: number
  upcoming: number
  thisYear: number
  lastYear: number
  uniqueVenues: number
  topVenue: { name: string; count: number } | null
  firstShow: Show | null
  nextShow: Show | null
}

function computeStats(shows: Show[]): ShowAggregates {
  const now = new Date()
  const active = shows.filter(s => s.status !== 'cancelled' && s.datetime)
  const past = active
    .filter(s => new Date(s.datetime) <= now)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
  const future = active
    .filter(s => new Date(s.datetime) > now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

  const year = now.getFullYear()
  const venueCounts = new Map<string, number>()
  for (const s of past) {
    venueCounts.set(s.venue, (venueCounts.get(s.venue) || 0) + 1)
  }
  let topVenue: ShowAggregates['topVenue'] = null
  for (const [name, count] of venueCounts) {
    if (!topVenue || count > topVenue.count) topVenue = { name, count }
  }

  return {
    played: past.length,
    upcoming: future.length,
    thisYear: past.filter(s => new Date(s.datetime).getFullYear() === year).length,
    lastYear: past.filter(s => new Date(s.datetime).getFullYear() === year - 1).length,
    uniqueVenues: venueCounts.size,
    topVenue,
    firstShow: past[past.length - 1] || null,
    nextShow: future[0] || null,
  }
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-arden-surface border border-arden-border p-5">
      <p className="text-arden-subtext text-xs tracking-widest uppercase mb-2">{label}</p>
      <p className="text-arden-white font-display font-bold text-3xl leading-none">{value}</p>
      {sub && <p className="text-arden-subtext text-xs mt-2 truncate">{sub}</p>}
    </div>
  )
}

function HistoryPageContent() {
  const { user } = useAuth()
  const [shows, setShows] = useState<Show[]>([])
  const [orders, setOrders] = useState<TicketOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'shows'))
      .then(snap => setShows(snap.docs.map(d => ({ id: d.id, ...d.data() } as Show))))
      .catch(err => {
        console.error('Failed to load shows:', err)
        setError('Failed to load show history.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Unconfirmed Venmo checkouts, so the page can say what's still unaccounted
  // for rather than quietly leaving it out of the totals
  useEffect(() => {
    if (!user) return
    user
      .getIdToken()
      .then(token => fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } }))
      .then(res => (res.ok ? res.json() : null))
      .then(data => data && setOrders(data.orders || []))
      .catch(err => console.error('Failed to load ticket orders:', err))
  }, [user])

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  const stats = computeStats(shows)
  const now = new Date()
  const past = shows
    .filter(s => s.datetime && new Date(s.datetime) <= now)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

  const nextShowLabel = stats.nextShow
    ? `${new Date(stats.nextShow.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${stats.nextShow.venue}`
    : '—'
  const daysToNext = stats.nextShow
    ? Math.ceil((new Date(stats.nextShow.datetime).getTime() - now.getTime()) / 86400000)
    : null

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">Show History &amp; Stats</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Shows Played" value={stats.played} sub={stats.firstShow ? `since ${new Date(stats.firstShow.datetime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : undefined} />
        <StatTile label={`Played ${now.getFullYear()}`} value={stats.thisYear} sub={stats.lastYear > 0 ? `${stats.lastYear} last year` : undefined} />
        <StatTile label="Venues Hit" value={stats.uniqueVenues} sub={stats.topVenue && stats.topVenue.count > 1 ? `most: ${stats.topVenue.name} (${stats.topVenue.count}x)` : undefined} />
        <StatTile
          label="Upcoming"
          value={stats.upcoming}
          sub={daysToNext === null ? 'nothing booked' : daysToNext < 1 ? 'show is today!' : `next in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}
        />
      </div>

      {/* Unconfirmed checkouts — money that may exist but isn't counted yet */}
      {(() => {
        const pending = orders.filter(o => o.status === 'pending')
        if (pending.length === 0) return null
        const pendingQty = pending.reduce((n, o) => n + (o.qty || 0), 0)
        const pendingAmount = pending.reduce((n, o) => n + (o.amount || 0), 0)
        const byShow = new Map<string, { venue: string; count: number }>()
        for (const o of pending) {
          const entry = byShow.get(o.showId) || { venue: o.showVenue, count: 0 }
          entry.count += 1
          byShow.set(o.showId, entry)
        }
        return (
          <div className="mb-4 p-4 bg-arden-surface border-l-2 border-yellow-600">
            <p className="text-yellow-500 text-xs tracking-widest uppercase mb-1.5 flex items-center gap-2">
              <Clock size={13} /> {pending.length} unconfirmed Venmo checkout{pending.length === 1 ? '' : 's'}
            </p>
            <p className="text-arden-text text-sm">
              {pendingQty} ticket{pendingQty === 1 ? '' : 's'} · {fmtMoney(pendingAmount)} — not counted below
              until someone checks the Venmo feed and confirms.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              {Array.from(byShow.entries()).map(([showId, info]) => (
                <Link
                  key={showId}
                  href={`/dashboard/shows/${showId}`}
                  className="text-xs text-arden-accent hover:underline"
                >
                  {info.venue} ({info.count}) →
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Money totals — appears once any sales or stats are logged */}
      {(() => {
        const active = shows.filter(s => s.status !== 'cancelled')
        const ticketRevenue = active.reduce((sum, s) => sum + (s.ticketSales || []).reduce((n, t) => n + (t.amount || 0), 0), 0)
        const ticketsSold = active.reduce((sum, s) => sum + (s.ticketSales || []).reduce((n, t) => n + (t.qty || 0), 0), 0)
        const payout = active.reduce((sum, s) => sum + (s.stats?.payout || 0), 0)
        const merch = active.reduce((sum, s) => sum + (s.stats?.merchSales || 0), 0)
        const costs = active.reduce((sum, s) => sum + (s.stats?.costs || 0), 0)
        const net = ticketRevenue + payout + merch - costs
        if (ticketsSold === 0 && payout === 0 && costs === 0 && merch === 0) return null
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatTile label="Tickets Sold" value={ticketsSold} sub={`${fmtMoney(ticketRevenue)} in ticket sales`} />
            <StatTile label="Payouts" value={fmtMoney(payout)} sub="from venues & hosts" />
            <StatTile label="Costs" value={fmtMoney(costs)} sub={merch > 0 ? `+${fmtMoney(merch)} merch sold` : undefined} />
            <StatTile label="Net Earned" value={fmtMoney(net)} sub="all-time, logged shows" />
          </div>
        )
      })()}

      {stats.nextShow && (
        <Link
          href={`/dashboard/shows/${stats.nextShow.id}`}
          className="block mb-10 p-4 bg-arden-surface border-l-2 border-arden-accent text-sm hover:bg-arden-muted transition-colors"
        >
          <span className="text-arden-accent text-xs tracking-widest uppercase mr-3">Next Up</span>
          <span className="text-arden-white font-medium">{nextShowLabel}</span>
          {stats.nextShow.location && <span className="text-arden-subtext"> · {stats.nextShow.location}</span>}
        </Link>
      )}

      {/* History list */}
      <div className="mb-4">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-4">
          Past Shows {past.length > 0 && `(${past.length})`}
        </p>
        {past.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart3 size={26} className="mx-auto text-arden-border mb-4" />
            <p className="text-arden-subtext">No past shows yet — history builds itself as dates pass.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {past.map(show => {
              const d = new Date(show.datetime)
              const sold = (show.ticketSales || []).reduce((n, t) => n + (t.qty || 0), 0)
              return (
                <Link
                  key={show.id}
                  href={`/dashboard/shows/${show.id}`}
                  className="block p-4 bg-arden-surface border border-arden-border hover:border-arden-accent/50 hover:bg-arden-muted transition-colors group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 text-center w-12">
                        <p className="text-arden-accent font-mono text-xs uppercase">
                          {d.toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-arden-white font-display font-bold text-xl leading-none">
                          {d.getDate()}
                        </p>
                        <p className="text-arden-border text-[10px] font-mono">{d.getFullYear()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-arden-white font-medium truncate">{show.venue}</p>
                        <p className="text-arden-subtext text-sm flex items-center gap-1.5 truncate">
                          <MapPin size={11} className="flex-shrink-0" />
                          {show.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sold > 0 && (
                        <span className="text-xs px-2 py-0.5 border border-arden-accent/40 text-arden-accent tracking-wider uppercase">
                          {sold} sold
                        </span>
                      )}
                      {show.status === 'cancelled' && (
                        <span className="text-xs px-2 py-0.5 border border-red-900 text-red-400 tracking-wider uppercase">
                          Cancelled
                        </span>
                      )}
                      {!show.isPublic && (
                        <span className="text-xs px-2 py-0.5 border border-arden-border text-arden-subtext tracking-wider uppercase">
                          Private
                        </span>
                      )}
                      <ChevronRight size={15} className="text-arden-border group-hover:text-arden-accent transition-colors" />
                    </div>
                  </div>
                  {show.notes && (
                    <p className="mt-2 ml-16 text-arden-subtext text-xs leading-relaxed">{show.notes}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <DashboardGuard>
      <HistoryPageContent />
    </DashboardGuard>
  )
}
