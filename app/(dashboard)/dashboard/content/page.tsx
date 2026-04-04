'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Save, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface SiteContent {
  estYear: string
  heroTagline: string
  bio: string
}

const DEFAULTS: SiteContent = {
  estYear: '2022',
  heroTagline: 'Indie rock from the ground up. Raw energy, honest songs, and a sound that keeps moving.',
  bio: 'Arden is an indie rock band crafting original music with an honest, lived-in sound. Formed through late-night rehearsals and relentless gigging, the band brings a raw energy to every performance — equal parts careful craft and in-the-moment feeling.',
}

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'siteContent', 'home')).then(snap => {
      if (snap.exists()) setContent({ ...DEFAULTS, ...(snap.data() as SiteContent) })
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'siteContent', 'home'), content)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Site Content</h1>
          <p className="text-arden-subtext text-sm mt-1">Edit text that appears on the public website.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-arden-accent hover:bg-arden-accent-dim text-arden-black text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-arden-surface border border-arden-border p-5">
          <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
            Est. Year <span className="normal-case">(shown in hero: "Est. 2022 — Original Music")</span>
          </label>
          <input
            type="text"
            value={content.estYear}
            onChange={e => setContent(c => ({ ...c, estYear: e.target.value }))}
            className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
            placeholder="2022"
          />
        </div>

        <div className="bg-arden-surface border border-arden-border p-5">
          <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
            Hero Tagline <span className="normal-case">(short line under "Arden" on homepage)</span>
          </label>
          <textarea
            value={content.heroTagline}
            onChange={e => setContent(c => ({ ...c, heroTagline: e.target.value }))}
            rows={3}
            className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
            placeholder="Indie rock from the ground up..."
          />
        </div>

        <div className="bg-arden-surface border border-arden-border p-5">
          <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
            Band Bio <span className="normal-case">(shown in "The Band" section on homepage)</span>
          </label>
          <textarea
            value={content.bio}
            onChange={e => setContent(c => ({ ...c, bio: e.target.value }))}
            rows={5}
            className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
            placeholder="Arden is an indie rock band..."
          />
        </div>

        <div className="border-t border-arden-border pt-6">
          <p className="text-xs text-arden-subtext mb-4 tracking-wider uppercase">Other Content</p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: 'Shows', desc: 'Manage public show listings', href: '/dashboard/shows' },
              { label: 'Set Lists', desc: 'Build and organize set lists', href: '/dashboard/setlists' },
              { label: 'Opportunities', desc: 'Track venues and outreach', href: '/dashboard/opportunities' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="group p-4 bg-arden-surface border border-arden-border hover:border-arden-muted transition-all flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-arden-white text-sm mb-0.5">{item.label}</h3>
                  <p className="text-arden-subtext text-xs">{item.desc}</p>
                </div>
                <ExternalLink size={12} className="text-arden-border group-hover:text-arden-subtext mt-0.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 bg-arden-surface border border-arden-border">
          <p className="text-xs text-arden-subtext leading-relaxed">
            <strong className="text-arden-text">Media:</strong> Videos are sourced from the{' '}
            <a href="https://youtube.com/@ardenjams" target="_blank" rel="noopener noreferrer"
              className="text-arden-accent hover:text-arden-white transition-colors">
              @ardenjams YouTube channel
            </a>. Update YouTube to refresh media on the site.
          </p>
        </div>
      </div>
    </div>
  )
}
