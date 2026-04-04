'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { db } from '@/lib/firebase/client'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AvailabilityEntry } from '@/lib/types'

const EVENT_TYPES = [
  { value: 'available', label: 'Available' },
  { value: 'band_practice', label: 'Band Practice' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'show', label: 'Show' },
  { value: 'other', label: 'Other' },
] as const

const TYPE_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  band_practice: 'bg-arden-accent/20 border-arden-accent/40 text-arden-accent',
  meeting: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  show: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  other: 'bg-arden-muted/40 border-arden-border text-arden-subtext',
}

const WEEKS_TO_SHOW = 8

function getCalendarWeeks(startOffset: number) {
  const weeks: Date[][] = []
  const base = new Date()
  base.setDate(base.getDate() + startOffset * 7)
  // Align to Sunday
  const dayOfWeek = base.getDay()
  base.setDate(base.getDate() - dayOfWeek)

  for (let w = 0; w < WEEKS_TO_SHOW; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(base)
      date.setDate(base.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }
  return weeks
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function typeLabel(type: string) {
  return EVENT_TYPES.find(t => t.value === type)?.label || type
}

interface EntryFormData {
  time: string
  type: string
  who: string
  notes: string
}

const EMPTY_FORM: EntryFormData = { time: '', type: 'available', who: '', notes: '' }

export default function AvailabilityPage() {
  const { user, membership } = useAuth()
  const [myEntries, setMyEntries] = useState<AvailabilityEntry[]>([])
  const [allAvailability, setAllAvailability] = useState<Record<string, { name: string; entries: AvailabilityEntry[] }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [form, setForm] = useState<EntryFormData>(EMPTY_FORM)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const weeks = getCalendarWeeks(weekOffset)

  useEffect(() => {
    if (!user) return
    fetchAvailability()
  }, [user])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedDate(null)
      }
    }
    if (selectedDate) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selectedDate])

  const fetchAvailability = async () => {
    const snap = await getDocs(collection(db, 'availabilities'))
    const agg: Record<string, { name: string; entries: AvailabilityEntry[] }> = {}
    snap.forEach(docSnap => {
      const data = docSnap.data()
      const entries: AvailabilityEntry[] = data.entries || (data.dates || []).map((d: string) => ({ date: d, type: 'available' }))
      if (docSnap.id === user?.uid) {
        setMyEntries(entries)
      }
      agg[docSnap.id] = {
        name: data.userName || data.userEmail,
        entries,
      }
    })
    setAllAvailability(agg)
  }

  const entriesForDate = (date: string) => myEntries.filter(e => e.date === date)

  const otherEntriesForDate = (date: string) => {
    const results: { name: string; entry: AvailabilityEntry }[] = []
    for (const [uid, data] of Object.entries(allAvailability)) {
      if (uid === user?.uid) continue
      for (const entry of data.entries) {
        if (entry.date === date) results.push({ name: data.name, entry })
      }
    }
    return results
  }

  const handleDateClick = (key: string) => {
    if (selectedDate === key) {
      setSelectedDate(null)
    } else {
      setSelectedDate(key)
      setForm(EMPTY_FORM)
      setEditIndex(null)
    }
  }

  const addEntry = () => {
    if (!selectedDate) return
    const entry: AvailabilityEntry = {
      date: selectedDate,
      type: form.type as AvailabilityEntry['type'],
      ...(form.time && { time: form.time }),
      ...(form.who && { who: form.who }),
      ...(form.notes && { notes: form.notes }),
    }
    if (editIndex !== null) {
      const dateEntries = myEntries.filter(e => e.date === selectedDate)
      const globalIndex = myEntries.indexOf(dateEntries[editIndex])
      const updated = [...myEntries]
      updated[globalIndex] = entry
      setMyEntries(updated)
      setEditIndex(null)
    } else {
      setMyEntries(prev => [...prev, entry])
    }
    setForm(EMPTY_FORM)
  }

  const removeEntry = (dateKey: string, localIndex: number) => {
    const dateEntries = myEntries.filter(e => e.date === dateKey)
    const globalIndex = myEntries.indexOf(dateEntries[localIndex])
    setMyEntries(prev => prev.filter((_, i) => i !== globalIndex))
  }

  const startEdit = (dateKey: string, localIndex: number) => {
    const entry = myEntries.filter(e => e.date === dateKey)[localIndex]
    setForm({
      time: entry.time || '',
      type: entry.type,
      who: entry.who || '',
      notes: entry.notes || '',
    })
    setEditIndex(localIndex)
  }

  const handleSave = async () => {
    if (!user || !membership) return
    setSaving(true)
    try {
      const dates = [...new Set(myEntries.map(e => e.date))]
      await setDoc(doc(db, 'availabilities', user.uid), {
        userId: user.uid,
        userEmail: user.email,
        userName: membership.displayName || user.email,
        dates,
        entries: myEntries,
        updatedAt: new Date().toISOString(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await fetchAvailability()
    } finally {
      setSaving(false)
    }
  }

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todayKey = toDateKey(new Date())
  const rangeLabel = `${weeks[0][0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weeks[WEEKS_TO_SHOW - 1][6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Availability</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
        >
          {saved ? (
            <><Check size={14} /> Saved</>
          ) : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <p className="text-arden-subtext text-sm mb-6">
        Click a day to add events. The band sees everyone&apos;s entries automatically.
      </p>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(prev => prev - WEEKS_TO_SHOW)}
          className="text-arden-subtext hover:text-arden-text transition-colors p-1"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-arden-subtext font-mono">{rangeLabel}</span>
        <button
          onClick={() => setWeekOffset(prev => prev + WEEKS_TO_SHOW)}
          className="text-arden-subtext hover:text-arden-text transition-colors p-1"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="relative">
        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-arden-subtext py-1 tracking-wider uppercase">
                  {d}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                {week.map((date) => {
                  const key = toDateKey(date)
                  const mine = entriesForDate(key)
                  const othersCount = otherEntriesForDate(key).length
                  const isSelected = selectedDate === key
                  const isToday = key === todayKey
                  const hasMine = mine.length > 0

                  return (
                    <button
                      key={key}
                      onClick={() => handleDateClick(key)}
                      className={`relative p-1.5 min-h-[64px] flex flex-col items-start justify-start transition-all duration-150 border text-left ${
                        isSelected
                          ? 'bg-arden-muted border-arden-accent ring-1 ring-arden-accent'
                          : hasMine
                            ? 'bg-arden-surface border-arden-accent/30'
                            : 'bg-arden-surface border-arden-border hover:border-arden-muted'
                      }`}
                    >
                      <span className={`text-xs font-mono ${isToday ? 'text-arden-accent font-bold' : 'text-arden-subtext'}`}>
                        {date.getDate()}
                      </span>
                      {mine.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5 w-full">
                          {mine.slice(0, 3).map((entry, i) => (
                            <span
                              key={i}
                              className={`text-[9px] leading-tight px-1 py-0.5 rounded border truncate max-w-full ${TYPE_COLORS[entry.type] || TYPE_COLORS.other}`}
                            >
                              {entry.time ? entry.time : typeLabel(entry.type).slice(0, 8)}
                            </span>
                          ))}
                          {mine.length > 3 && (
                            <span className="text-[9px] text-arden-subtext">+{mine.length - 3}</span>
                          )}
                        </div>
                      )}
                      {othersCount > 0 && (
                        <span className="absolute bottom-1 right-1.5 text-[10px] font-medium text-arden-accent">
                          {othersCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Entry panel */}
        {selectedDate && (
          <div
            ref={panelRef}
            className="mt-4 border border-arden-border bg-arden-dark p-5 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-arden-white">
                {formatDateLabel(new Date(selectedDate + 'T12:00:00'))}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-arden-subtext hover:text-arden-text">
                <X size={16} />
              </button>
            </div>

            {/* Existing entries for this date */}
            {entriesForDate(selectedDate).length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-arden-subtext tracking-wider uppercase">Your entries</p>
                {entriesForDate(selectedDate).map((entry, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded border ${TYPE_COLORS[entry.type] || TYPE_COLORS.other}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{typeLabel(entry.type)}</span>
                        {entry.time && <span className="text-xs opacity-70">{entry.time}</span>}
                        {entry.who && <span className="text-xs opacity-70">- {entry.who}</span>}
                      </div>
                      {entry.notes && <p className="text-xs opacity-60 mt-0.5 truncate">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => startEdit(selectedDate, i)}
                        className="text-xs px-2 py-1 hover:bg-white/10 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeEntry(selectedDate, i)}
                        className="text-xs px-2 py-1 hover:bg-red-500/20 rounded transition-colors text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Others' entries */}
            {otherEntriesForDate(selectedDate).length > 0 && (
              <div className="space-y-1 mb-4">
                <p className="text-xs text-arden-subtext tracking-wider uppercase">Others</p>
                {otherEntriesForDate(selectedDate).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-arden-subtext py-1.5 px-3 bg-arden-surface rounded">
                    <span className="font-medium text-arden-text">{item.name}</span>
                    <span className="opacity-60">-</span>
                    <span>{typeLabel(item.entry.type)}</span>
                    {item.entry.time && <span className="opacity-60">{item.entry.time}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Add/edit form */}
            <div className="border-t border-arden-border pt-4">
              <p className="text-xs text-arden-subtext tracking-wider uppercase mb-3">
                {editIndex !== null ? 'Edit Entry' : 'Add Entry'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-arden-subtext mb-1 block">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-arden-surface border border-arden-border text-arden-text text-sm px-3 py-2 focus:outline-none focus:border-arden-accent"
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-arden-subtext mb-1 block">Time (optional)</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full bg-arden-surface border border-arden-border text-arden-text text-sm px-3 py-2 focus:outline-none focus:border-arden-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-arden-subtext mb-1 block">Who (optional)</label>
                  <input
                    type="text"
                    value={form.who}
                    onChange={e => setForm(f => ({ ...f, who: e.target.value }))}
                    placeholder="e.g. full band, just drums + bass"
                    className="w-full bg-arden-surface border border-arden-border text-arden-text text-sm px-3 py-2 focus:outline-none focus:border-arden-accent placeholder:text-arden-subtext/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-arden-subtext mb-1 block">Notes (optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. after 6pm works best"
                    className="w-full bg-arden-surface border border-arden-border text-arden-text text-sm px-3 py-2 focus:outline-none focus:border-arden-accent placeholder:text-arden-subtext/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addEntry}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {editIndex !== null ? 'Update' : 'Add'}
                </button>
                {editIndex !== null && (
                  <button
                    onClick={() => { setEditIndex(null); setForm(EMPTY_FORM) }}
                    className="btn-ghost text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-arden-subtext">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-arden-accent/20 border border-arden-accent/40" />
          <span>Practice</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
          <span>Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40" />
          <span>Show</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-arden-accent font-medium">3</span>
          <span>= others&apos; entries that day</span>
        </div>
      </div>
    </div>
  )
}
