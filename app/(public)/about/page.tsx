'use client'

import { useState } from 'react'
import { Camera, Play, Send } from 'lucide-react'

export default function AboutPage() {
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

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">The Story</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">About</h1>
        </div>

        {/* Bio */}
        <div className="grid md:grid-cols-2 gap-16 mb-24">
          <div>
            <div className="aspect-square bg-arden-surface flex items-center justify-center">
              <span className="font-display text-6xl text-arden-border">A</span>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="heading-display text-3xl text-arden-white mb-6">
              Arden is an indie rock band playing original music.
            </h2>
            <div className="space-y-4 text-arden-subtext leading-relaxed">
              <p>
                Formed through shared obsessions with sound and performance, Arden
                has spent their time building something real — not a genre exercise,
                but a body of work that reflects who they are.
              </p>
              <p>
                The songs are lived in. The performances are committed. The band
                shows up with something to say and the chops to say it.
              </p>
              <p>
                Based out of the Northeast, they play wherever the rooms are right
                and the people are ready.
              </p>
            </div>

            <div className="flex gap-4 mt-8">
              <a
                href="https://www.instagram.com/ardenjams"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors text-sm"
              >
                <Camera size={16} />
                @ardenjams
              </a>
              <a
                href="https://youtube.com/@ardenjams"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors text-sm"
              >
                <Play size={16} />
                @ardenjams
              </a>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="border-t border-arden-border pt-16">
          <div className="max-w-2xl">
            <p className="section-label mb-3">Get in Touch</p>
            <h2 className="heading-display text-3xl text-arden-white mb-8">Contact</h2>

            {status === 'sent' ? (
              <div className="p-6 bg-arden-surface border border-arden-accent">
                <p className="text-arden-white font-medium">Message sent.</p>
                <p className="text-arden-subtext text-sm mt-1">We'll be in touch.</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
