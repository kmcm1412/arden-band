'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [showPhone, setShowPhone] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      } else {
        setStatus('success')
        setMessage("You're in. We'll keep you posted.")
        setEmail('')
        setPhone('')
        setShowPhone(false)
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-arden-accent text-sm tracking-wider">{message}</p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 bg-arden-dark border border-arden-border text-arden-text px-4 py-2.5 text-sm focus:outline-none focus:border-arden-accent placeholder:text-arden-border"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary text-xs py-2.5 px-5 disabled:opacity-50 whitespace-nowrap"
        >
          {status === 'loading' ? 'Saving...' : 'Stay Updated'} <ArrowRight size={14} />
        </button>
      </div>

      {!showPhone && (
        <button
          type="button"
          onClick={() => setShowPhone(true)}
          className="mt-2 text-xs text-arden-border hover:text-arden-subtext transition-colors"
        >
          + Add phone for SMS updates (optional)
        </button>
      )}

      {showPhone && (
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000 — SMS updates (optional)"
          className="mt-2 w-full bg-arden-dark border border-arden-border text-arden-text px-4 py-2.5 text-sm focus:outline-none focus:border-arden-accent placeholder:text-arden-border"
        />
      )}

      {status === 'error' && (
        <p className="mt-2 text-red-400 text-xs">{message}</p>
      )}
    </form>
  )
}
