'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('sent')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="p-6 bg-arden-surface border border-arden-accent">
        <p className="text-arden-white font-medium">Message sent.</p>
        <p className="text-arden-subtext text-sm mt-1">We&apos;ll be in touch.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-arden-surface border border-arden-border text-arden-text px-4 py-3 text-sm focus:outline-none focus:border-arden-accent transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-arden-surface border border-arden-border text-arden-text px-4 py-3 text-sm focus:outline-none focus:border-arden-accent transition-colors"
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div>
        <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-2">
          Message
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          className="w-full bg-arden-surface border border-arden-border text-arden-text px-4 py-3 text-sm focus:outline-none focus:border-arden-accent transition-colors resize-none"
          placeholder="Booking inquiries, questions, or just say hi."
        />
      </div>
      {status === 'error' && (
        <p className="text-red-400 text-sm">Something went wrong. Try again.</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn-primary disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
        <Send size={14} />
      </button>
    </form>
  )
}
