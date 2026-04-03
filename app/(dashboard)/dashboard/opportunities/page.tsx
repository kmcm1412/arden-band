'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { Opportunity } from '@/lib/types'
import { Plus, Check, X, Mail, Copy } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  new: 'text-blue-400 border-blue-900',
  contacted: 'text-yellow-400 border-yellow-900',
  awaiting: 'text-orange-400 border-orange-900',
  confirmed: 'text-green-400 border-green-800',
  rejected: 'text-red-400 border-red-900',
}

const EMPTY: Omit<Opportunity, 'id'> = {
  venueName: '',
  location: '',
  email: '',
  notes: '',
  status: 'new',
}

function generateEmailDraft(venue: Opportunity) {
  return `Subject: Booking Inquiry — Arden

Hi ${venue.venueName} team,

My name is [Your Name] and I'm reaching out on behalf of Arden, an indie rock band based in the Northeast.

We've been building a following through regional touring and are looking to expand our bookings. We'd love to discuss the possibility of performing at ${venue.venueName}.

We'd be happy to send along our press kit, social links, and any other materials you need.

Best,
[Your Name]
Arden
https://www.instagram.com/ardenjams
https://youtube.com/@ardenjams`
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Opportunity, 'id'>>(EMPTY)
  const [draft, setDraft] = useState<{ venue: Opportunity; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchOpportunities() }, [])

  const fetchOpportunities = async () => {
    const snap = await getDocs(collection(db, 'opportunities'))
    setOpportunities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity)))
  }

  const handleCreate = async () => {
    if (!form.venueName) return
    await addDoc(collection(db, 'opportunities'), { ...form, createdAt: new Date().toISOString() })
    setCreating(false)
    setForm(EMPTY)
    fetchOpportunities()
  }

  const updateStatus = async (id: string, status: Opportunity['status']) => {
    await updateDoc(doc(db, 'opportunities', id), { status })
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const showDraft = (venue: Opportunity) => {
    setDraft({ venue, text: generateEmailDraft(venue) })
  }

  const copyDraft = () => {
    if (draft) {
      navigator.clipboard.writeText(draft.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Opportunities</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary text-xs py-2 px-5">
          <Plus size={14} /> Add Venue
        </button>
      </div>

      {creating && (
        <div className="bg-arden-surface border border-arden-border p-5 mb-6">
          <h2 className="font-medium text-arden-white mb-4">New Opportunity</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'venueName', label: 'Venue', placeholder: 'Venue name' },
              { key: 'location', label: 'Location', placeholder: 'City, State' },
              { key: 'email', label: 'Contact Email', placeholder: 'booking@venue.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">{f.label}</label>
                <input
                  type="text"
                  value={(form as any)[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                />
              </div>
            ))}
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Opportunity['status'] }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="awaiting">Awaiting Response</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="btn-primary text-xs py-2 px-5">
              <Check size={14} /> Save
            </button>
            <button onClick={() => setCreating(false)} className="btn-ghost text-xs py-2 px-5">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Draft modal */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-arden-dark border border-arden-border w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-arden-border">
              <h2 className="font-medium text-arden-white text-sm">Email Draft &mdash; {draft.venue.venueName}</h2>
              <button onClick={() => setDraft(null)} className="text-arden-subtext hover:text-arden-text">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={draft.text}
              onChange={e => setDraft(prev => prev ? { ...prev, text: e.target.value } : null)}
              className="flex-1 bg-arden-dark text-arden-text px-5 py-4 text-sm font-mono focus:outline-none resize-none"
              rows={16}
            />
            <div className="px-5 py-4 border-t border-arden-border flex gap-3">
              <button onClick={copyDraft} className="btn-primary text-xs py-2 px-5">
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
              {draft.venue.email && (
                <a
                  href={`mailto:${draft.venue.email}?subject=Booking Inquiry — Arden&body=${encodeURIComponent(draft.text)}`}
                  className="btn-ghost text-xs py-2 px-5 flex items-center gap-2"
                >
                  <Mail size={14} /> Open in Mail
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {opportunities.length === 0 && (
          <div className="text-center py-12 text-arden-subtext">
            No opportunities tracked yet.
          </div>
        )}
        {opportunities.map(opp => (
          <div key={opp.id} className="p-4 bg-arden-surface border border-arden-border hover:border-arden-muted transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-arden-white">{opp.venueName}</span>
                  <span className={`text-xs px-2 py-0.5 border tracking-wider uppercase ${STATUS_COLORS[opp.status] || 'text-arden-subtext border-arden-border'}`}>
                    {opp.status}
                  </span>
                </div>
                <p className="text-arden-subtext text-sm">{opp.location}</p>
                {opp.notes && <p className="text-arden-subtext text-xs mt-1 italic">{opp.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={opp.status}
                  onChange={e => updateStatus(opp.id!, e.target.value as Opportunity['status'])}
                  className="bg-arden-dark border border-arden-border text-arden-subtext px-2 py-1 text-xs focus:outline-none focus:border-arden-accent"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="awaiting">Awaiting</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  onClick={() => showDraft(opp)}
                  className="p-2 text-arden-subtext hover:text-arden-accent transition-colors"
                  title="Generate email draft"
                >
                  <Mail size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
