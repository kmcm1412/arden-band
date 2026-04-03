'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { db } from '@/lib/firebase/client'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query
} from 'firebase/firestore'
import { Show } from '@/lib/types'
import { Plus, Pencil, Trash2, ExternalLink, Check, X } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const EMPTY_SHOW: Omit<Show, 'id'> = {
  title: '',
  venue: '',
  location: '',
  datetime: '',
  ticketLink: '',
  notes: '',
  status: 'pending',
  isPublic: true,
}

export default function ShowsPage() {
  const { membership } = useAuth()
  const isAdmin = membership?.role === 'admin'
  const [shows, setShows] = useState<Show[]>([])
  const [editing, setEditing] = useState<Show | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Show, 'id'>>(EMPTY_SHOW)

  useEffect(() => { fetchShows() }, [])

  const fetchShows = async () => {
    const q = query(collection(db, 'shows'), orderBy('datetime', 'asc'))
    const snap = await getDocs(q)
    setShows(snap.docs.map(d => ({ id: d.id, ...d.data() } as Show)))
  }

  const handleSave = async () => {
    if (!form.venue || !form.datetime) return
    if (editing?.id) {
      await updateDoc(doc(db, 'shows', editing.id), { ...form })
    } else {
      await addDoc(collection(db, 'shows'), { ...form, createdAt: new Date().toISOString() })
    }
    setEditing(null)
    setCreating(false)
    setForm(EMPTY_SHOW)
    fetchShows()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this show?')) return
    await deleteDoc(doc(db, 'shows', id))
    fetchShows()
  }

  const startEdit = (show: Show) => {
    setEditing(show)
    setForm({ ...show })
    setCreating(false)
  }

  const cancelEdit = () => {
    setEditing(null)
    setCreating(false)
    setForm(EMPTY_SHOW)
  }

  const showForm = creating || editing !== null

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Shows</h1>
        </div>
        {isAdmin && !showForm && (
          <button onClick={() => setCreating(true)} className="btn-primary text-xs py-2 px-5">
            <Plus size={14} /> Add Show
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && isAdmin && (
        <div className="bg-arden-surface border border-arden-border p-6 mb-6">
          <h2 className="font-medium text-arden-white mb-4">
            {editing ? 'Edit Show' : 'New Show'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: 'venue', label: 'Venue', placeholder: 'Venue name', type: 'text' },
              { key: 'location', label: 'Location', placeholder: 'City, State', type: 'text' },
              { key: 'datetime', label: 'Date & Time', placeholder: '', type: 'datetime-local' },
              { key: 'ticketLink', label: 'Ticket Link', placeholder: 'https://...', type: 'url' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={(form as any)[field.key] || ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                />
              </div>
            ))}
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Show['status'] }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                id="isPublic"
                type="checkbox"
                checked={form.isPublic}
                onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                className="w-4 h-4 accent-[#c8a96e]"
              />
              <label htmlFor="isPublic" className="text-sm text-arden-text">Public (show on website)</label>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="btn-primary text-xs py-2 px-5">
              <Check size={14} /> Save
            </button>
            <button onClick={cancelEdit} className="btn-ghost text-xs py-2 px-5">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Shows list */}
      <div className="space-y-2">
        {shows.length === 0 && (
          <div className="text-center py-12 text-arden-subtext">
            No shows yet. {isAdmin && 'Add your first show.'}
          </div>
        )}
        {shows.map(show => (
          <div key={show.id} className="flex items-center justify-between p-4 bg-arden-surface border border-arden-border hover:border-arden-muted transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-medium text-arden-white">{show.venue}</span>
                <span className={`text-xs px-2 py-0.5 border tracking-wider uppercase ${
                  show.status === 'confirmed' ? 'border-green-800 text-green-400' :
                  show.status === 'cancelled' ? 'border-red-900 text-red-400' :
                  'border-arden-border text-arden-subtext'
                }`}>
                  {show.status}
                </span>
                {!show.isPublic && (
                  <span className="text-xs px-2 py-0.5 border border-arden-border text-arden-subtext tracking-wider uppercase">
                    Private
                  </span>
                )}
              </div>
              <p className="text-arden-subtext text-sm">{show.location} &middot; {show.datetime ? formatDateTime(show.datetime) : '—'}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {show.ticketLink && (
                <a href={show.ticketLink} target="_blank" rel="noopener noreferrer"
                  className="p-2 text-arden-subtext hover:text-arden-accent transition-colors">
                  <ExternalLink size={14} />
                </a>
              )}
              {isAdmin && (
                <>
                  <button onClick={() => startEdit(show)}
                    className="p-2 text-arden-subtext hover:text-arden-text transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(show.id!)}
                    className="p-2 text-arden-subtext hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
