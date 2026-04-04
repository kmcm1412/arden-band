'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Plus, Check, X, UserCheck, UserX } from 'lucide-react'
import { Membership } from '@/lib/types'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

function AccessPageContent() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Membership[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'band_member' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchMembers = async () => {
    const token = await user?.getIdToken()
    const res = await fetch('/api/admin/members', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members)
    }
  }

  useEffect(() => { if (user) fetchMembers() }, [user])

  const handleAdd = async () => {
    if (!form.email) return
    setLoading(true)
    setError('')
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setAdding(false)
      setForm({ email: '', role: 'band_member' })
      if (data.pending) {
        setInfo(`Invitation saved for ${form.email}. They'll get access when they first sign in.`)
      }
      fetchMembers()
    } catch {
      setError('Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (uid: string, active: boolean) => {
    const token = await user?.getIdToken()
    await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, active }),
    })
    fetchMembers()
  }

  const changeRole = async (uid: string, role: string) => {
    const token = await user?.getIdToken()
    await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, role }),
    })
    fetchMembers()
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Access Management</h1>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary text-xs py-2 px-5">
          <Plus size={14} /> Add Member
        </button>
      </div>

      <div className="mb-4 p-4 bg-arden-surface border border-arden-border text-xs text-arden-subtext leading-relaxed">
        <strong className="text-arden-accent">Security note:</strong> Enter any email — if they haven&apos;t signed in yet, an invitation is saved and access is granted automatically on their first login.
      </div>

      {info && (
        <div className="mb-4 p-4 bg-arden-surface border border-green-800 text-xs text-green-400 leading-relaxed">
          {info}
        </div>
      )}

      {adding && (
        <div className="bg-arden-surface border border-arden-border p-5 mb-6">
          <h2 className="font-medium text-arden-white mb-4">Add Approved Member</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="member@email.com"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              >
                <option value="band_member">Band Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={loading} className="btn-primary text-xs py-2 px-5 disabled:opacity-50">
              <Check size={14} /> Add
            </button>
            <button onClick={() => { setAdding(false); setError('') }} className="btn-ghost text-xs py-2 px-5">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.uid} className={`flex items-center justify-between p-4 bg-arden-surface border transition-colors ${m.active ? 'border-arden-border' : 'border-red-950 opacity-60'}`}>
            <div>
              <p className="font-medium text-arden-white text-sm">{m.email}</p>
              <p className="text-arden-subtext text-xs mt-0.5">
                {m.displayName && <span className="mr-2">{m.displayName}</span>}
                <span className="capitalize">{m.role?.replace('_', ' ')}</span>
                {!m.active && <span className="ml-2 text-red-400">&middot; Deactivated</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={e => changeRole(m.uid, e.target.value)}
                className="bg-arden-dark border border-arden-border text-arden-subtext px-2 py-1 text-xs focus:outline-none"
              >
                <option value="band_member">Band Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => toggleActive(m.uid, !m.active)}
                className={`p-2 transition-colors ${m.active ? 'text-arden-subtext hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}
                title={m.active ? 'Deactivate' : 'Activate'}
              >
                {m.active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-center py-12 text-arden-subtext">No approved members yet.</div>
        )}
      </div>
    </div>
  )
}

export default function AccessPage() {
  return (
    <DashboardGuard requireAdmin>
      <AccessPageContent />
    </DashboardGuard>
  )
}
