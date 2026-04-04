'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Download } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

interface Subscriber {
  id: string
  email: string
  name?: string
  phone?: string
  subscribedAt?: { seconds: number }
}

function SubscribersPageContent() {
  const { user } = useAuth()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    user.getIdToken().then(token =>
      fetch('/api/admin/subscribers', { headers: { Authorization: `Bearer ${token}` } })
    ).then(r => r.json()).then(data => {
      setSubscribers(data.subscribers || [])
      setTotal(data.total || 0)
    }).finally(() => setLoading(false))
  }, [user])

  function downloadCSV() {
    const rows = [['Email', 'Name', 'Phone', 'Subscribed']]
    subscribers.forEach(s => {
      const date = s.subscribedAt ? new Date(s.subscribedAt.seconds * 1000).toLocaleDateString() : ''
      rows.push([s.email, s.name || '', s.phone || '', date])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arden-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Fan List</h1>
          <p className="text-arden-subtext text-sm mt-1">{total} subscriber{total !== 1 ? 's' : ''}</p>
        </div>
        {subscribers.length > 0 && (
          <button onClick={downloadCSV} className="btn-ghost text-xs py-2 px-4 flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {subscribers.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-arden-subtext">No subscribers yet.</p>
          <p className="text-arden-subtext text-xs mt-2">The signup form is live on the homepage.</p>
        </div>
      ) : (
        <div className="space-y-px">
          {subscribers.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-arden-surface border border-arden-border">
              <div>
                <p className="text-arden-white text-sm font-medium">{s.email}</p>
                {(s.name || s.phone) && (
                  <p className="text-arden-subtext text-xs mt-0.5">
                    {s.name && <span className="mr-3">{s.name}</span>}
                    {s.phone && <span>{s.phone}</span>}
                  </p>
                )}
              </div>
              {s.subscribedAt && (
                <span className="text-arden-border text-xs font-mono">
                  {new Date(s.subscribedAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubscribersPage() {
  return (
    <DashboardGuard requireAdmin>
      <SubscribersPageContent />
    </DashboardGuard>
  )
}
