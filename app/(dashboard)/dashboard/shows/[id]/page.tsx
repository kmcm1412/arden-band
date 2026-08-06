'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/firebase/client'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Show, TicketSale, ShowStats } from '@/lib/types'
import { useAuth } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, Ticket, DollarSign, Save } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

const EMPTY_SALE = { name: '', qty: 1, method: 'venmo' as TicketSale['method'], amount: 0, note: '' }
const EMPTY_STATS: ShowStats = { attendance: undefined, payout: undefined, costs: undefined, merchSales: undefined, notes: '' }

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function ShowDetailContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, membership } = useAuth()
  const isAdmin = membership?.role === 'admin'

  const [show, setShow] = useState<Show | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saleForm, setSaleForm] = useState(EMPTY_SALE)
  const [addingSale, setAddingSale] = useState(false)
  const [statsForm, setStatsForm] = useState<ShowStats>(EMPTY_STATS)
  const [statsSaving, setStatsSaving] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    getDoc(doc(db, 'shows', params.id))
      .then(snap => {
        if (!snap.exists()) {
          setError('Show not found.')
          return
        }
        const data = { id: snap.id, ...snap.data() } as Show
        setShow(data)
        setStatsForm({ ...EMPTY_STATS, ...(data.stats || {}) })
      })
      .catch(err => {
        console.error('Failed to load show:', err)
        setError('Failed to load show.')
      })
      .finally(() => setLoading(false))
  }, [params?.id])

  const sales = show?.ticketSales || []
  const ticketsSold = sales.reduce((sum, s) => sum + (s.qty || 0), 0)
  const ticketRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0)
  const stats = show?.stats || {}
  const net = (stats.payout || 0) + (stats.merchSales || 0) + ticketRevenue - (stats.costs || 0)
  const isPast = show ? new Date(show.datetime) <= new Date() : false

  const persistSales = async (next: TicketSale[], action: string, detail: string) => {
    if (!show?.id) return
    try {
      await updateDoc(doc(db, 'shows', show.id), { ticketSales: next })
      setShow(s => (s ? { ...s, ticketSales: next } : s))
      logActivity(user, action, detail)
    } catch (err) {
      console.error('Failed to save sales:', err)
      setError('Failed to save. Are you an admin?')
    }
  }

  const addSale = async () => {
    if (!saleForm.name.trim() || saleForm.qty < 1) return
    const sale: TicketSale = {
      id: genId(),
      name: saleForm.name.trim(),
      qty: saleForm.qty,
      method: saleForm.method,
      amount: saleForm.amount,
      ...(saleForm.note.trim() ? { note: saleForm.note.trim() } : {}),
      addedAt: new Date().toISOString(),
    }
    await persistSales([...sales, sale], 'logged ticket sale', `${sale.name} · ${sale.qty} for $${sale.amount} (${show?.venue})`)
    setSaleForm(EMPTY_SALE)
    setAddingSale(false)
  }

  const removeSale = async (id: string) => {
    const sale = sales.find(s => s.id === id)
    if (!confirm(`Remove the sale for ${sale?.name || 'this buyer'}?`)) return
    await persistSales(sales.filter(s => s.id !== id), 'removed ticket sale', `${sale?.name} (${show?.venue})`)
  }

  const saveStats = async () => {
    if (!show?.id) return
    setStatsSaving(true)
    setError('')
    try {
      // Strip undefined values — Firestore rejects them
      const clean = Object.fromEntries(
        Object.entries(statsForm).filter(([, v]) => v !== undefined && v !== '')
      )
      await updateDoc(doc(db, 'shows', show.id), { stats: clean })
      setShow(s => (s ? { ...s, stats: clean as ShowStats } : s))
      logActivity(user, 'updated show stats', show.venue)
      setStatsSaved(true)
      setTimeout(() => setStatsSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save stats:', err)
      setError('Failed to save stats.')
    } finally {
      setStatsSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>
  if (!show) {
    return (
      <div className="p-8">
        <p className="text-arden-subtext">{error || 'Show not found.'}</p>
        <button onClick={() => router.back()} className="btn-ghost text-xs py-2 px-4 mt-4">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    )
  }

  const d = new Date(show.datetime)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/dashboard/shows"
        className="inline-flex items-center gap-2 text-xs text-arden-subtext hover:text-arden-accent transition-colors uppercase tracking-wider mb-6"
      >
        <ArrowLeft size={14} /> All Shows
      </Link>

      {/* Header */}
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">
          {isPast ? 'Past Show' : 'Upcoming Show'} · {show.status}
        </p>
        <h1 className="text-2xl font-display font-bold text-arden-white">{show.venue}</h1>
        <p className="text-arden-subtext text-sm mt-1">
          {show.location} · {show.datetime ? formatDateTime(show.datetime) : '—'}
        </p>
        {show.notes && <p className="text-arden-subtext text-xs mt-2 italic">{show.notes}</p>}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm">{error}</div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Tickets Sold</p>
          <p className="text-arden-white font-display font-bold text-2xl">{ticketsSold}</p>
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Ticket Revenue</p>
          <p className="text-arden-white font-display font-bold text-2xl">${ticketRevenue}</p>
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Payout + Merch</p>
          <p className="text-arden-white font-display font-bold text-2xl">
            ${(stats.payout || 0) + (stats.merchSales || 0)}
          </p>
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Net</p>
          <p className={`font-display font-bold text-2xl ${net >= 0 ? 'text-arden-accent' : 'text-red-400'}`}>
            ${net}
          </p>
        </div>
      </div>

      {/* Ticket sales ledger */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
            <Ticket size={14} /> Ticket Sales
          </h2>
          {isAdmin && !addingSale && (
            <button onClick={() => {
              setSaleForm({ ...EMPTY_SALE, amount: (show.ticketPrice || 0) * 1 })
              setAddingSale(true)
            }} className="btn-ghost text-xs py-1.5 px-4">
              <Plus size={12} /> Log Sale
            </button>
          )}
        </div>

        {addingSale && isAdmin && (
          <div className="bg-arden-surface border border-arden-border p-5 mb-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Buyer / party name</label>
                <input
                  type="text"
                  value={saleForm.name}
                  onChange={e => setSaleForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Kyle McMahon"
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Tickets</label>
                  <input
                    type="number"
                    min="1"
                    value={saleForm.qty}
                    onChange={e => {
                      const qty = parseInt(e.target.value) || 1
                      setSaleForm(f => ({ ...f, qty, amount: (show.ticketPrice || 0) > 0 ? qty * (show.ticketPrice || 0) : f.amount }))
                    }}
                    className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Paid ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleForm.amount}
                    onChange={e => setSaleForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Payment method</label>
                <select
                  value={saleForm.method}
                  onChange={e => setSaleForm(f => ({ ...f, method: e.target.value as TicketSale['method'] }))}
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                >
                  <option value="venmo">Venmo</option>
                  <option value="cash">Cash</option>
                  <option value="door">At the door</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={saleForm.note}
                  onChange={e => setSaleForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. paid half, owes $10"
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addSale} disabled={!saleForm.name.trim()} className="btn-primary text-xs py-2 px-5 disabled:opacity-50">
                Add Sale
              </button>
              <button onClick={() => { setAddingSale(false); setSaleForm(EMPTY_SALE) }} className="btn-ghost text-xs py-2 px-5">
                Cancel
              </button>
            </div>
          </div>
        )}

        {sales.length === 0 && !addingSale ? (
          <p className="text-arden-subtext text-sm py-6 text-center border border-dashed border-arden-border">
            No sales logged yet{isAdmin ? ' — use "Log Sale" to track who bought tickets.' : '.'}
          </p>
        ) : (
          <div className="space-y-px">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-center gap-4 p-3.5 bg-arden-surface border border-arden-border">
                <div className="flex-1 min-w-0">
                  <p className="text-arden-white text-sm font-medium truncate">{sale.name}</p>
                  {sale.note && <p className="text-arden-subtext text-xs truncate">{sale.note}</p>}
                </div>
                <span className="text-arden-subtext text-xs uppercase tracking-wider flex-shrink-0">{sale.method}</span>
                <span className="text-arden-text text-sm font-mono flex-shrink-0">{sale.qty} tkt{sale.qty === 1 ? '' : 's'}</span>
                <span className="text-arden-accent text-sm font-mono flex-shrink-0 w-14 text-right">${sale.amount}</span>
                {isAdmin && (
                  <button
                    onClick={() => removeSale(sale.id)}
                    className="text-arden-subtext hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove sale"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post-show stats */}
      <div>
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
          <DollarSign size={14} /> Show Numbers
        </h2>
        <div className="bg-arden-surface border border-arden-border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['attendance', 'Attendance', 'headcount'],
              ['payout', 'Band Payout ($)', 'from venue/host'],
              ['costs', 'Costs ($)', 'travel, gear, fees'],
              ['merchSales', 'Merch Sales ($)', 'at the show'],
            ] as const).map(([key, label, hint]) => (
              <div key={key}>
                <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!isAdmin}
                  value={statsForm[key] ?? ''}
                  onChange={e =>
                    setStatsForm(f => ({ ...f, [key]: e.target.value === '' ? undefined : parseFloat(e.target.value) }))
                  }
                  placeholder="—"
                  className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
                />
                <p className="text-arden-border text-[10px] mt-1">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Debrief Notes</label>
            <textarea
              value={statsForm.notes || ''}
              disabled={!isAdmin}
              onChange={e => setStatsForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="How'd it go? What to remember for next time?"
              className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none disabled:opacity-60"
            />
          </div>
          {isAdmin && (
            <button onClick={saveStats} disabled={statsSaving} className="btn-primary text-xs py-2 px-5 mt-4 disabled:opacity-50">
              <Save size={12} /> {statsSaved ? 'Saved!' : statsSaving ? 'Saving...' : 'Save Numbers'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShowDetailPage() {
  return (
    <DashboardGuard>
      <ShowDetailContent />
    </DashboardGuard>
  )
}
