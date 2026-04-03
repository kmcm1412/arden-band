'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { db } from '@/lib/firebase/client'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { Check } from 'lucide-react'

const NEXT_WEEKS = 8
const today = new Date()

function getWeekDates() {
  const weeks: Date[][] = []
  for (let w = 0; w < NEXT_WEEKS; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() + w * 7 + d)
      week.push(date)
    }
    weeks.push(week)
  }
  return weeks
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

export default function AvailabilityPage() {
  const { user, membership } = useAuth()
  const [myDates, setMyDates] = useState<Set<string>>(new Set())
  const [allAvailability, setAllAvailability] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const weeks = getWeekDates()

  useEffect(() => {
    if (!user) return
    fetchAvailability()
  }, [user])

  const fetchAvailability = async () => {
    const snap = await getDocs(collection(db, 'availabilities'))
    const agg: Record<string, string[]> = {}
    snap.forEach(docSnap => {
      const data = docSnap.data()
      if (docSnap.id === user?.uid) {
        setMyDates(new Set(data.dates || []))
      }
      ;(data.dates || []).forEach((d: string) => {
        if (!agg[d]) agg[d] = []
        agg[d].push(data.userName || data.userEmail)
      })
    })
    setAllAvailability(agg)
  }

  const toggleDate = (key: string) => {
    setMyDates(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    if (!user || !membership) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'availabilities', user.uid), {
        userId: user.uid,
        userEmail: user.email,
        userName: membership.displayName || user.email,
        dates: Array.from(myDates),
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
        Click dates when you&apos;re available. The band sees overlaps automatically.
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-arden-subtext py-1 tracking-wider uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((date) => {
                const key = toDateKey(date)
                const isMine = myDates.has(key)
                const others = allAvailability[key] || []
                const count = others.length

                return (
                  <button
                    key={key}
                    onClick={() => toggleDate(key)}
                    className={`relative p-2 min-h-[56px] flex flex-col items-center justify-start transition-all duration-150 border ${
                      isMine
                        ? 'bg-arden-accent border-arden-accent text-arden-black'
                        : 'bg-arden-surface border-arden-border hover:border-arden-muted text-arden-text'
                    }`}
                  >
                    <span className="text-xs font-mono">
                      {date.getDate()}
                    </span>
                    {count > 0 && (
                      <span className={`text-xs mt-1 font-medium ${isMine ? 'text-arden-black' : 'text-arden-accent'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6 text-xs text-arden-subtext">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-arden-accent" />
          <span>You&apos;re available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-arden-surface border border-arden-border" />
          <span>Number = others available</span>
        </div>
      </div>
    </div>
  )
}
