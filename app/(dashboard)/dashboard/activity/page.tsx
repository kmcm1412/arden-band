'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { History } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'
import type { ActivityEntry } from '@/lib/activity'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ActivityPageContent() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Live feed — new entries appear without refreshing
    const q = query(collection(db, 'activityLog'), orderBy('at', 'desc'), limit(100))
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityEntry)))
      setLoading(false)
    }, err => {
      console.error('Activity feed error:', err)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">Activity</h1>
        <p className="text-arden-subtext text-sm mt-1">
          Who changed what — updates appear live.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="py-20 text-center">
          <History size={28} className="mx-auto text-arden-border mb-4" />
          <p className="text-arden-subtext">No activity recorded yet.</p>
          <p className="text-arden-subtext text-xs mt-2">Dashboard actions will show up here from now on.</p>
        </div>
      ) : (
        <div className="space-y-px">
          {entries.map(e => (
            <div key={e.id} className="flex items-baseline gap-3 px-4 py-3 bg-arden-surface border border-arden-border text-sm">
              <span className="text-arden-accent font-medium flex-shrink-0">{e.actorName}</span>
              <span className="text-arden-text">
                {e.action}
                {e.detail && <span className="text-arden-subtext"> — {e.detail}</span>}
              </span>
              <span className="ml-auto text-arden-border text-xs font-mono flex-shrink-0" title={new Date(e.at).toLocaleString()}>
                {timeAgo(e.at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <DashboardGuard>
      <ActivityPageContent />
    </DashboardGuard>
  )
}
