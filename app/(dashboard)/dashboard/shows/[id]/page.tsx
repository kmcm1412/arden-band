'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/firebase/client'
import { doc, getDoc, updateDoc, runTransaction, collection, getDocs } from 'firebase/firestore'
import { Show, TicketSale, ShowStats, TicketOrder, ShowExpense, DoorSales, ShowPayouts, Membership, PendingEdit, PendingEditField, FinanceApproval, ShowRecording, SocialPost, SetList } from '@/lib/types'
import { parseVenmoPaste, showFinancials } from '@/lib/tickets'
import { isTrustedEditor, withPendingEdit, clearPendingFor, pendingFor, describeValue, FIELD_LABELS } from '@/lib/approvals'
import { useAuth } from '@/lib/auth/context'
import { logActivity } from '@/lib/activity'
import { formatDateTime, fmtMoney, roundMoney, parseShowDate } from '@/lib/utils'
import { ArrowLeft, Plus, Ticket, DollarSign, Save, Clock, ClipboardPaste } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'
import { SaleRow, OrderRow, useExpandedRow } from '@/components/dashboard/TicketRows'
import { GuestListExport, TicketSalesToggle } from '@/components/dashboard/TicketControls'
import ShowExpenses from '@/components/dashboard/ShowExpenses'
import DoorSalesInput from '@/components/dashboard/DoorSalesInput'
import ShowPayoutsEditor from '@/components/dashboard/ShowPayoutsEditor'
import PendingEditsPanel, { PendingTag } from '@/components/dashboard/PendingEditsPanel'
import ActualSetList from '@/components/dashboard/ActualSetList'
import { ShowRecordings, ShowSocialPosts } from '@/components/dashboard/ShowMediaLinks'

const IMPORT_PLACEHOLDER = [
  '2 tickets - $20 (The Delancey): Kyle, Sam',
  'Jane Doe, 1, 10',
].join('\n')

const EXTRA_ACTIONS = {
  actualSetList: 'updated the played set list',
  recordings: 'updated show recordings',
  socialPosts: 'updated show social posts',
} as const

const EMPTY_SALE = { name: '', qty: 1, method: 'venmo' as TicketSale['method'], amount: 0, note: '' }
const EMPTY_STATS: ShowStats = { attendance: undefined, payout: undefined, costs: undefined, merchSales: undefined, notes: '' }

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
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
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [statsForm, setStatsForm] = useState<ShowStats>(EMPTY_STATS)
  const [statsSaving, setStatsSaving] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)
  const [orders, setOrders] = useState<TicketOrder[]>([])
  const [ordersError, setOrdersError] = useState('')
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  // One row open at a time across both lists — opening a row closes the other
  const { expandedKey, toggleRow } = useExpandedRow()
  const [salesToggleBusy, setSalesToggleBusy] = useState(false)
  const [expensesBusy, setExpensesBusy] = useState(false)
  const [doorBusy, setDoorBusy] = useState(false)
  const [payoutsBusy, setPayoutsBusy] = useState(false)
  const [roster, setRoster] = useState<Membership[]>([])
  const [approval, setApproval] = useState<FinanceApproval | null>(null)
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const [extrasBusy, setExtrasBusy] = useState<string | null>(null)
  const [plannedSongs, setPlannedSongs] = useState<string[]>([])

  const loadShow = useCallback(async (resetStats = false) => {
    if (!params?.id) return
    const snap = await getDoc(doc(db, 'shows', params.id))
    if (!snap.exists()) {
      setError('Show not found.')
      return
    }
    const data = { id: snap.id, ...snap.data() } as Show
    setShow(data)
    // Only clobber an in-progress edit when a review put the numbers back
    setStatsForm(prev =>
      resetStats || prev === EMPTY_STATS ? { ...EMPTY_STATS, ...(data.stats || {}) } : prev
    )
  }, [params?.id])

  // Orders live behind the Admin SDK (they hold fan names), so they come from
  // the admin API rather than a direct Firestore read
  const loadOrders = useCallback(async () => {
    if (!params?.id || !user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/tickets?showId=${encodeURIComponent(params.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403 || res.status === 401) return // non-admins just don't see this panel
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setOrdersError('')
    } catch (err) {
      console.error('Failed to load ticket orders:', err)
      setOrdersError('Could not load Venmo checkouts.')
    }
  }, [params?.id, user])

  useEffect(() => {
    if (!params?.id) return
    loadShow()
      .catch(err => {
        console.error('Failed to load show:', err)
        setError('Failed to load show.')
      })
      .finally(() => setLoading(false))
  }, [params?.id, loadShow])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // The planned set list for this show, so "What We Played" can start from it.
  // Read straight from Firestore — setlists are readable by any member.
  useEffect(() => {
    if (!params?.id) return
    getDocs(collection(db, 'setlists'))
      .then(snap => {
        const match = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as SetList)
          .find(l => l.showId === params.id)
        const titles = (match?.songs || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(song => song.title)
          .filter(Boolean)
        setPlannedSongs(titles)
      })
      .catch(err => console.error('Failed to load planned set list:', err))
  }, [params?.id])

  // Who may edit finances unreviewed. A failed or missing read leaves this null
  // and isTrustedEditor falls back to the built-in list, so the review step is
  // never skipped just because config could not be fetched.
  useEffect(() => {
    getDoc(doc(db, 'siteContent', 'financeApproval'))
      .then(snap => setApproval(snap.exists() ? (snap.data() as FinanceApproval) : null))
      .catch(err => console.error('Failed to load finance approval config:', err))
  }, [])

  // Reference only — the payout split is entered by hand, not derived from this.
  // Members rules let admins read the roster; anyone else quietly gets nothing.
  useEffect(() => {
    if (!user || !isAdmin) return
    user
      .getIdToken()
      .then(token => fetch('/api/admin/members', { headers: { Authorization: `Bearer ${token}` } }))
      .then(res => (res.ok ? res.json() : null))
      .then(data => data && setRoster(data.members || []))
      .catch(err => console.error('Failed to load members:', err))
  }, [user, isAdmin])


  const sales = show?.ticketSales || []
  // Memoized because `|| []` would otherwise mint a new array on every render,
  // and the expenses editor re-syncs whenever this reference changes
  const expenses = useMemo(() => show?.expenses || [], [show?.expenses])
  const stats = show?.stats || {}
  // One shared calculation, so this page and the history page can't disagree
  const doorSales = show?.doorSales
  const payouts = show?.payouts
  const money = showFinancials({ ticketSales: sales, expenses, doorSales, payouts, stats })
  const { ticketsSold, ticketRevenue } = money
  const isPast = show ? parseShowDate(show.datetime) <= new Date() : false
  const pendingOrders = orders.filter(o => o.status === 'pending')
  // Undefined means enabled: shows created before the toggle keep selling
  const ticketSalesEnabled = show?.ticketSalesEnabled !== false

  const actualSetList = useMemo(() => show?.actualSetList || [], [show?.actualSetList])
  const recordings = useMemo(() => show?.recordings || [], [show?.recordings])
  const socialPosts = useMemo(() => show?.socialPosts || [], [show?.socialPosts])

  /**
   * Writer for the sections that aren't money — set list, recordings, posts.
   *
   * Deliberately does not touch `pendingEdits`: none of this is financial, so
   * none of it waits on a second signature. Kept separate from the financial
   * writers so that stays true by construction rather than by remembering.
   */
  const persistExtra = async (
    field: 'actualSetList' | 'recordings' | 'socialPosts',
    value: unknown,
    detail: string
  ) => {
    if (!show?.id) return
    setExtrasBusy(field)
    setError('')
    try {
      await updateDoc(doc(db, 'shows', show.id), { [field]: value })
      setShow(s => (s ? { ...s, [field]: value } : s))
      logActivity(user, EXTRA_ACTIONS[field], `${show.venue} · ${detail}`)
    } catch (err) {
      console.error(`Failed to save ${field}:`, err)
      setError('Could not save that. Are you an admin?')
      loadShow().catch(() => {})
    } finally {
      setExtrasBusy(null)
    }
  }

  const pendingEdits = useMemo(() => show?.pendingEdits || [], [show?.pendingEdits])
  const trustedEditor = isTrustedEditor(user?.email, approval)

  /**
   * Works out what `pendingEdits` should become alongside a financial write.
   *
   * A trusted member's edit settles anything open on that field — their word is
   * the sign-off. Anyone else's is filed for review, carrying forward the
   * original snapshot if they are editing something already pending.
   */
  const nextPendingEdits = (
    field: PendingEditField,
    previous: unknown,
    nextValue: unknown,
    current: PendingEdit[]
  ): PendingEdit[] => {
    if (trustedEditor) return clearPendingFor(current, field)
    return withPendingEdit(current, {
      id: genId(),
      field,
      summary: describeValue(field, nextValue),
      previousSummary: describeValue(field, previous),
      previous: previous ?? null,
      byUid: user?.uid || '',
      byName: membership?.displayName || user?.email || 'Unknown',
      byEmail: (user?.email || '').toLowerCase(),
      at: new Date().toISOString(),
    })
  }

  const reviewEdit = async (edit: PendingEdit, action: 'confirm' | 'reject') => {
    if (!user || !show?.id) return
    setReviewBusy(edit.id)
    setError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/shows/edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showId: show.id, editId: edit.id, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await loadShow(edit.field === 'stats')
      logActivity(
        user,
        action === 'confirm' ? 'confirmed a financial change' : 'reverted a financial change',
        `${FIELD_LABELS[edit.field]} on ${show.venue}, changed by ${edit.byName}`
      )
    } catch (err) {
      console.error('Review failed:', err)
      setError(err instanceof Error ? err.message : 'Could not review that change.')
    } finally {
      setReviewBusy(null)
    }
  }

  // Saved on edit rather than behind a save button, matching the sales toggle
  const persistExpenses = async (next: ShowExpense[]) => {
    if (!show?.id) return
    setExpensesBusy(true)
    setError('')
    try {
      const nextPending = nextPendingEdits('expenses', expenses, next, pendingEdits)
      await updateDoc(doc(db, 'shows', show.id), { expenses: next, pendingEdits: nextPending })
      setShow(s => (s ? { ...s, expenses: next, pendingEdits: nextPending } : s))
      const total = next.reduce((n, e) => n + (e.amount || 0), 0)
      logActivity(user, 'updated show expenses', `${show.venue} · ${fmtMoney(total)} deducted`)
    } catch (err) {
      console.error('Failed to save expenses:', err)
      setError('Could not save expenses. Are you an admin?')
      // Put back what Firestore actually holds so the rows don't lie
      loadShow().catch(() => {})
    } finally {
      setExpensesBusy(false)
    }
  }

  const persistDoorSales = async (next: DoorSales) => {
    if (!show?.id) return
    setDoorBusy(true)
    setError('')
    try {
      const nextPending = nextPendingEdits('doorSales', show.doorSales ?? null, next, pendingEdits)
      await updateDoc(doc(db, 'shows', show.id), { doorSales: next, pendingEdits: nextPending })
      setShow(s => (s ? { ...s, doorSales: next, pendingEdits: nextPending } : s))
      logActivity(
        user,
        'updated door sales',
        `${show.venue} · ${next.count} at the door for ${fmtMoney(next.amount)}`
      )
    } catch (err) {
      console.error('Failed to save door sales:', err)
      setError('Could not save door sales. Are you an admin?')
      loadShow().catch(() => {})
    } finally {
      setDoorBusy(false)
    }
  }

  const persistPayouts = async (next: ShowPayouts) => {
    if (!show?.id) return
    setPayoutsBusy(true)
    setError('')
    try {
      const nextPending = nextPendingEdits('payouts', show.payouts ?? null, next, pendingEdits)
      await updateDoc(doc(db, 'shows', show.id), { payouts: next, pendingEdits: nextPending })
      setShow(s => (s ? { ...s, payouts: next, pendingEdits: nextPending } : s))
      logActivity(
        user,
        'updated show payouts',
        `${show.venue} · ${fmtMoney(next.perMember)} x ${next.memberCount} · ${fmtMoney(next.bandFund)} to the fund`
      )
    } catch (err) {
      console.error('Failed to save payouts:', err)
      setError('Could not save payouts. Are you an admin?')
      loadShow().catch(() => {})
    } finally {
      setPayoutsBusy(false)
    }
  }

  const setTicketSalesEnabled = async (next: boolean) => {
    if (!show?.id) return
    setSalesToggleBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'shows', show.id), { ticketSalesEnabled: next })
      setShow(s => (s ? { ...s, ticketSalesEnabled: next } : s))
      logActivity(
        user,
        next ? 'enabled ticket sales' : 'disabled ticket sales',
        show.venue
      )
    } catch (err) {
      console.error('Failed to toggle ticket sales:', err)
      setError('Could not change ticket sales. Are you an admin?')
    } finally {
      setSalesToggleBusy(false)
    }
  }

  // Transaction: read-modify-write so two admins logging sales at the same
  // time can't clobber each other's entries
  const persistSales = async (
    mutate: (current: TicketSale[]) => TicketSale[],
    action: string,
    detail: string
  ) => {
    if (!show?.id) return false
    const ref = doc(db, 'shows', show.id)
    try {
      const next = await runTransaction(db, async txn => {
        const snap = await txn.get(ref)
        const current = (snap.data()?.ticketSales || []) as TicketSale[]
        const currentPending = (snap.data()?.pendingEdits || []) as PendingEdit[]
        const result = mutate(current)
        // Read from the snapshot, not local state, so a concurrent edit's
        // pending record survives this write
        const nextPending = nextPendingEdits('ticketSales', current, result, currentPending)
        txn.update(ref, { ticketSales: result, pendingEdits: nextPending })
        return { result, nextPending }
      })
      setShow(s => (s ? { ...s, ticketSales: next.result, pendingEdits: next.nextPending } : s))
      logActivity(user, action, detail)
      return true
    } catch (err) {
      console.error('Failed to save sales:', err)
      setError('Failed to save. Are you an admin?')
      return false
    }
  }

  const saveSale = async () => {
    if (!saleForm.name.trim() || saleForm.qty < 1 || saleForm.amount < 0) return
    const base = {
      name: saleForm.name.trim(),
      qty: saleForm.qty,
      method: saleForm.method,
      amount: roundMoney(saleForm.amount),
      ...(saleForm.note.trim() ? { note: saleForm.note.trim() } : {}),
    }
    let ok: boolean
    if (editingSaleId) {
      ok = await persistSales(
        current => current.map(s => (s.id === editingSaleId ? { ...s, ...base } : s)),
        'edited ticket sale',
        `${base.name} · ${base.qty} for ${fmtMoney(base.amount)} (${show?.venue})`
      )
    } else {
      const sale: TicketSale = { id: genId(), ...base, addedAt: new Date().toISOString() }
      ok = await persistSales(
        current => [...current, sale],
        'logged ticket sale',
        `${sale.name} · ${sale.qty} for ${fmtMoney(sale.amount)} (${show?.venue})`
      )
    }
    if (ok) {
      setSaleForm(EMPTY_SALE)
      setAddingSale(false)
      setEditingSaleId(null)
    }
  }

  const startEditSale = (sale: TicketSale) => {
    setSaleForm({ name: sale.name, qty: sale.qty, method: sale.method, amount: sale.amount, note: sale.note || '' })
    setEditingSaleId(sale.id)
    setAddingSale(true)
  }

  const removeSale = async (id: string) => {
    const sale = sales.find(s => s.id === id)
    if (!confirm(`Remove the sale for ${sale?.name || 'this buyer'}?`)) return
    await persistSales(
      current => current.filter(s => s.id !== id),
      'removed ticket sale',
      `${sale?.name} (${show?.venue})`
    )
  }

  /**
   * Confirming a checkout is what turns it into money: the API appends the
   * TicketSale server-side, so the show is re-read rather than patched locally.
   */
  const actOnOrder = async (order: TicketOrder, action: 'confirm' | 'void' | 'unconfirm') => {
    if (!user || !order.id) return
    if (action === 'void' && !confirm(`Dismiss the checkout for ${order.names.join(', ') || 'this fan'}?`)) return
    setBusyOrderId(order.id)
    setOrdersError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await Promise.all([loadOrders(), loadShow()])
      logActivity(
        user,
        action === 'confirm' ? 'confirmed Venmo ticket order' : action === 'void' ? 'dismissed Venmo ticket order' : 'reopened Venmo ticket order',
        `${order.names.join(', ') || 'unnamed'} · ${order.qty} for ${fmtMoney(order.amount)} (${show?.venue})`
      )
    } catch (err) {
      console.error('Order action failed:', err)
      setOrdersError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const importPreview = importText.trim() ? parseVenmoPaste(importText) : null

  const runImport = async () => {
    if (!importPreview || importPreview.rows.length === 0) return
    setImporting(true)
    const newSales: TicketSale[] = importPreview.rows.map(r => ({
      id: genId(),
      name: r.name,
      qty: r.qty,
      method: 'venmo' as const,
      amount: r.amount,
      ...(r.note ? { note: r.note } : {}),
      addedAt: new Date().toISOString(),
    }))
    const ok = await persistSales(
      current => [...current, ...newSales],
      'imported Venmo ticket sales',
      `${newSales.length} sale${newSales.length === 1 ? '' : 's'} (${show?.venue})`
    )
    setImporting(false)
    if (ok) {
      setImportText('')
      setImportOpen(false)
    }
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
      const nextPending = nextPendingEdits('stats', show.stats ?? null, clean, pendingEdits)
      await updateDoc(doc(db, 'shows', show.id), { stats: clean, pendingEdits: nextPending })
      setShow(s => (s ? { ...s, stats: clean as ShowStats, pendingEdits: nextPending } : s))
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

      <PendingEditsPanel
        edits={pendingEdits}
        currentUid={user?.uid}
        busyId={reviewBusy}
        onReview={reviewEdit}
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Tickets Sold</p>
          <p className="text-arden-white font-display font-bold text-2xl">{money.totalTickets}</p>
          {money.doorCount > 0 && (
            <p className="text-arden-subtext text-[10px] mt-1">
              {ticketsSold} presale · {money.doorCount} at the door
            </p>
          )}
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Gross Revenue</p>
          <p className="text-arden-white font-display font-bold text-2xl">{fmtMoney(money.gross)}</p>
          {money.gross !== ticketRevenue && (
            <p className="text-arden-subtext text-[10px] mt-1">
              {fmtMoney(ticketRevenue)} presale
              {money.doorRevenue > 0 && ` · ${fmtMoney(money.doorRevenue)} door`}
            </p>
          )}
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Expenses</p>
          <p className="text-arden-white font-display font-bold text-2xl">
            {money.outgoings > 0 ? `−${fmtMoney(money.outgoings)}` : fmtMoney(0)}
          </p>
          {(stats.costs || 0) > 0 && money.expensesTotal > 0 && (
            <p className="text-arden-subtext text-[10px] mt-1">
              incl. {fmtMoney(stats.costs || 0)} other costs
            </p>
          )}
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Net Revenue</p>
          <p
            className={`font-display font-bold text-2xl ${
              money.netRevenue >= 0 ? 'text-arden-white' : 'text-red-400'
            }`}
          >
            {fmtMoney(money.netRevenue)}
          </p>
          <p className="text-arden-subtext text-[10px] mt-1">gross less expenses</p>
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Member Payouts</p>
          <p className="text-arden-white font-display font-bold text-2xl">
            {fmtMoney(money.memberPayouts)}
          </p>
          {money.hasPayouts && payouts && (
            <p className="text-arden-subtext text-[10px] mt-1">
              {fmtMoney(payouts.perMember)} × {payouts.memberCount}
            </p>
          )}
        </div>
        <div className="bg-arden-surface border border-arden-border p-4">
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1.5">Band Fund</p>
          <p
            className={`font-display font-bold text-2xl ${
              money.bandFund >= 0 ? 'text-arden-accent' : 'text-red-400'
            }`}
          >
            {fmtMoney(money.bandFund)}
          </p>
          <p className="text-arden-subtext text-[10px] mt-1">
            {money.hasPayouts ? 'kept for shared costs' : 'no split recorded yet'}
          </p>
        </div>
      </div>

      {/* Public ticket sales switch */}
      {isAdmin && (
        <div className="mb-10">
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
            <Ticket size={14} /> Ticket Settings
          </h2>
          <TicketSalesToggle
            enabled={ticketSalesEnabled}
            busy={salesToggleBusy}
            onChange={setTicketSalesEnabled}
          />
        </div>
      )}

      {/* Venmo checkouts — intent captured from the public widget */}
      {isAdmin && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
              <Clock size={14} /> Venmo Checkouts
              {pendingOrders.length > 0 && (
                <span className="text-arden-black bg-arden-accent px-1.5 py-0.5 text-[10px] font-mono">
                  {pendingOrders.length}
                </span>
              )}
            </h2>
            <button onClick={() => setImportOpen(o => !o)} className="btn-ghost text-xs py-1.5 px-4">
              <ClipboardPaste size={12} /> Import from Venmo
            </button>
          </div>
          <p className="text-arden-subtext text-xs mb-4 leading-relaxed">
            Fans who tapped &quot;Pay with Venmo&quot; on the site. Venmo can&apos;t tell the site
            when a payment actually lands, so these stay out of the totals until you match them
            against your Venmo feed and confirm.
          </p>

          {ordersError && (
            <div className="mb-3 p-3 bg-red-900/20 border border-red-900 text-red-400 text-xs">{ordersError}</div>
          )}

          {importOpen && (
            <div className="bg-arden-surface border border-arden-border p-5 mb-4">
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">
                Paste Venmo payments
              </label>
              <p className="text-arden-subtext text-xs mb-2 leading-relaxed">
                One per line. Either a Venmo note (&quot;2 tickets - $20 (The Delancey): Kyle, Sam&quot;)
                or a plain row (&quot;Kyle McMahon, 2, 20&quot;).
              </p>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={5}
                placeholder={IMPORT_PLACEHOLDER}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm font-mono focus:outline-none focus:border-arden-accent resize-y"
              />
              {importPreview && (
                <div className="mt-3">
                  {importPreview.rows.length > 0 && (
                    <div className="space-y-px mb-2">
                      {importPreview.rows.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-arden-dark border border-arden-border text-sm">
                          <span className="text-arden-white flex-1 truncate">{r.name}</span>
                          <span className="text-arden-text font-mono text-xs">{r.qty} tkt{r.qty === 1 ? '' : 's'}</span>
                          <span className="text-arden-accent font-mono text-xs w-14 text-right">{fmtMoney(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {importPreview.skipped.length > 0 && (
                    <div className="p-3 bg-red-900/10 border border-red-900/40 mb-2">
                      <p className="text-red-400 text-xs mb-1">
                        {importPreview.skipped.length} line{importPreview.skipped.length === 1 ? '' : 's'} couldn&apos;t be read and won&apos;t be imported:
                      </p>
                      {importPreview.skipped.map((line, i) => (
                        <p key={i} className="text-arden-subtext text-xs font-mono truncate">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={runImport}
                  disabled={importing || !importPreview || importPreview.rows.length === 0}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
                >
                  {importing
                    ? 'Importing...'
                    : `Add ${importPreview?.rows.length || 0} sale${importPreview?.rows.length === 1 ? '' : 's'}`}
                </button>
                <button
                  onClick={() => { setImportOpen(false); setImportText('') }}
                  className="btn-ghost text-xs py-2 px-5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {orders.length === 0 ? (
            <p className="text-arden-subtext text-sm py-6 text-center border border-dashed border-arden-border">
              No Venmo checkouts recorded for this show yet.
            </p>
          ) : (
            <div className="space-y-px">
              {orders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  open={expandedKey === `order:${order.id}`}
                  onToggle={() => toggleRow(`order:${order.id}`)}
                  busy={busyOrderId === order.id}
                  onAct={action => actOnOrder(order, action)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket sales ledger */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
            <Ticket size={14} /> Ticket Sales
            <PendingTag edit={pendingFor(pendingEdits, 'ticketSales')} />
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
              <button onClick={saveSale} disabled={!saleForm.name.trim()} className="btn-primary text-xs py-2 px-5 disabled:opacity-50">
                {editingSaleId ? 'Update Sale' : 'Add Sale'}
              </button>
              <button
                onClick={() => { setAddingSale(false); setEditingSaleId(null); setSaleForm(EMPTY_SALE) }}
                className="btn-ghost text-xs py-2 px-5"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <GuestListExport
          venue={show.venue}
          datetime={show.datetime}
          sales={sales}
          pendingOrders={pendingOrders}
        />

        {sales.length === 0 && !addingSale ? (
          <p className="text-arden-subtext text-sm py-6 text-center border border-dashed border-arden-border">
            No sales logged yet{isAdmin ? ' — use "Log Sale" to track who bought tickets.' : '.'}
          </p>
        ) : (
          <div className="space-y-px">
            {sales.map(sale => (
              <SaleRow
                key={sale.id}
                sale={sale}
                open={expandedKey === `sale:${sale.id}`}
                onToggle={() => toggleRow(`sale:${sale.id}`)}
                isAdmin={isAdmin}
                onEdit={() => startEditSale(sale)}
                onRemove={() => removeSale(sale.id)}
              />
            ))}
          </div>
        )}
      </div>

      <DoorSalesInput
        doorSales={doorSales}
        isAdmin={isAdmin}
        busy={doorBusy}
        pending={pendingFor(pendingEdits, 'doorSales')}
        onChange={persistDoorSales}
      />

      <ShowExpenses
        expenses={expenses}
        isAdmin={isAdmin}
        busy={expensesBusy}
        pending={pendingFor(pendingEdits, 'expenses')}
        onChange={persistExpenses}
      />

      <ShowPayoutsEditor
        payouts={payouts}
        netRevenue={money.netRevenue}
        roster={roster}
        isAdmin={isAdmin}
        busy={payoutsBusy}
        pending={pendingFor(pendingEdits, 'payouts')}
        onChange={persistPayouts}
      />

      {/* Non-financial extras — no review step applies to any of these */}
      <ActualSetList
        songs={actualSetList}
        isAdmin={isAdmin}
        busy={extrasBusy === 'actualSetList'}
        plannedSongs={plannedSongs}
        onChange={next =>
          persistExtra('actualSetList', next, `${next.length} song${next.length === 1 ? '' : 's'}`)
        }
      />

      <ShowRecordings
        recordings={recordings}
        isAdmin={isAdmin}
        busy={extrasBusy === 'recordings'}
        onChange={(next: ShowRecording[]) =>
          persistExtra('recordings', next, `${next.length} recording${next.length === 1 ? '' : 's'}`)
        }
      />

      <ShowSocialPosts
        posts={socialPosts}
        isAdmin={isAdmin}
        busy={extrasBusy === 'socialPosts'}
        onChange={(next: SocialPost[]) =>
          persistExtra('socialPosts', next, `${next.length} post${next.length === 1 ? '' : 's'}`)
        }
      />

      {/* Post-show stats */}
      <div>
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2 mb-4">
          <DollarSign size={14} /> Show Numbers
          <PendingTag edit={pendingFor(pendingEdits, 'stats')} />
        </h2>
        <div className="bg-arden-surface border border-arden-border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ['attendance', 'Attendance', 'headcount'],
              ['payout', 'Band Payout ($)', 'from venue/host'],
              ['costs', 'Other Costs ($)', 'travel, gear — not the itemized ones'],
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
