'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase/client'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Save, ExternalLink, Upload, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

interface SiteContent {
  // Homepage — Hero
  estYear: string
  heroTagline: string
  // Homepage — About strip
  bio: string
  aboutHeading: string
  aboutAccent: string
  // Homepage — Newsletter
  newsletterHeading: string
  newsletterDescription: string
  // About page
  aboutImage: string
  aboutPageHeading: string
  aboutPageBio1: string
  aboutPageBio2: string
  aboutPageBio3: string
  // Merch page
  merchNote: string
  // Shows page — empty states
  showsEmptyMessage: string
  showsEmptySubtext: string
  // Social links (used site-wide)
  instagramUrl: string
  youtubeUrl: string
  instagramHandle: string
}

const DEFAULTS: SiteContent = {
  estYear: '2022',
  heroTagline: 'Indie rock from the ground up. Raw energy, honest songs, and a sound that keeps moving.',
  bio: 'Arden is an indie rock band crafting original music with an honest, lived-in sound. Formed through late-night rehearsals and relentless gigging, the band brings a raw energy to every performance — equal parts careful craft and in-the-moment feeling.',
  aboutHeading: 'Built on stage,',
  aboutAccent: 'refined in the room.',
  newsletterHeading: 'Get Updates',
  newsletterDescription: 'New shows, releases, and merch drops — straight to your inbox.',
  aboutImage: '',
  aboutPageHeading: 'Arden is an indie rock band playing original music.',
  aboutPageBio1: 'Formed through shared obsessions with sound and performance, Arden has spent their time building something real — not a genre exercise, but a body of work that reflects who they are.',
  aboutPageBio2: 'The songs are lived in. The performances are committed. The band shows up with something to say and the chops to say it.',
  aboutPageBio3: 'Based out of the Northeast, they play wherever the rooms are right and the people are ready.',
  merchNote: 'Merch available at shows and through direct order — reach out via the contact form.',
  showsEmptyMessage: 'No upcoming shows announced.',
  showsEmptySubtext: 'Follow us on Instagram for updates.',
  instagramUrl: 'https://www.instagram.com/ardenjams',
  youtubeUrl: 'https://youtube.com/@ardenjams',
  instagramHandle: '@ardenjams',
}

function ContentPageContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDoc(doc(db, 'siteContent', 'home')).then(snap => {
      if (snap.exists()) setContent({ ...DEFAULTS, ...(snap.data() as SiteContent) })
    }).catch(err => {
      console.error('Failed to load site content:', err)
      setError('Failed to load content. Check console for details.')
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await setDoc(doc(db, 'siteContent', 'home'), content)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      console.error('Failed to save site content:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Check console.')
    } finally {
      setSaving(false)
    }
  }

  function compressImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        // Resize to max 800px on longest side
        const max = maxSize
        let w = img.width, h = img.height
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max }
          else { w = Math.round(w * max / h); h = max }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const dataUrl = await compressImage(file, 800)
      setContent(c => ({ ...c, aboutImage: dataUrl }))
    } catch (err: unknown) {
      console.error('Failed to process image:', err)
      setError(err instanceof Error ? err.message : 'Failed to process image.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* ─── HOMEPAGE: HERO ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Homepage — Hero</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Est. Year
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
                Hero Tagline <span className="normal-case">(short line under &quot;Arden&quot;)</span>
              </label>
              <textarea
                value={content.heroTagline}
                onChange={e => setContent(c => ({ ...c, heroTagline: e.target.value }))}
                rows={3}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
                placeholder="Indie rock from the ground up..."
              />
            </div>
          </div>
        </div>

        {/* ─── HOMEPAGE: ABOUT STRIP ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Homepage — About Section</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Section Heading <span className="normal-case">(first line)</span>
              </label>
              <input
                type="text"
                value={content.aboutHeading}
                onChange={e => setContent(c => ({ ...c, aboutHeading: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="Built on stage,"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Accent Line <span className="normal-case">(highlighted second line)</span>
              </label>
              <input
                type="text"
                value={content.aboutAccent}
                onChange={e => setContent(c => ({ ...c, aboutAccent: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="refined in the room."
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Band Bio <span className="normal-case">(paragraph next to heading)</span>
              </label>
              <textarea
                value={content.bio}
                onChange={e => setContent(c => ({ ...c, bio: e.target.value }))}
                rows={5}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
                placeholder="Arden is an indie rock band..."
              />
            </div>
          </div>
        </div>

        {/* ─── HOMEPAGE: NEWSLETTER ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Homepage — Newsletter</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Heading</label>
              <input
                type="text"
                value={content.newsletterHeading}
                onChange={e => setContent(c => ({ ...c, newsletterHeading: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="Get Updates"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Description</label>
              <textarea
                value={content.newsletterDescription}
                onChange={e => setContent(c => ({ ...c, newsletterDescription: e.target.value }))}
                rows={2}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
                placeholder="New shows, releases, and merch drops..."
              />
            </div>
          </div>
        </div>

        {/* ─── ABOUT PAGE ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">About Page</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Band Photo <span className="normal-case">(square image shown on about page)</span>
              </label>
              <div className="flex items-start gap-4">
                {content.aboutImage ? (
                  <div className="w-32 h-32 flex-shrink-0 bg-arden-dark border border-arden-border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={content.aboutImage} alt="About photo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-32 h-32 flex-shrink-0 bg-arden-dark border border-arden-border flex items-center justify-center">
                    <ImageIcon size={24} className="text-arden-border" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-arden-muted hover:bg-arden-border text-arden-text text-xs font-medium px-3 py-2 transition-colors disabled:opacity-50"
                  >
                    <Upload size={12} />
                    {uploading ? 'Uploading...' : content.aboutImage ? 'Replace Photo' : 'Upload Photo'}
                  </button>
                  <p className="text-xs text-arden-subtext">Square image recommended. Image is compressed automatically. Hit &quot;Save Changes&quot; after selecting.</p>
                </div>
              </div>
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Heading <span className="normal-case">(bold line next to photo)</span>
              </label>
              <textarea
                value={content.aboutPageHeading}
                onChange={e => setContent(c => ({ ...c, aboutPageHeading: e.target.value }))}
                rows={2}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
                placeholder="Arden is an indie rock band playing original music."
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Bio — Paragraph 1</label>
              <textarea
                value={content.aboutPageBio1}
                onChange={e => setContent(c => ({ ...c, aboutPageBio1: e.target.value }))}
                rows={3}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Bio — Paragraph 2</label>
              <textarea
                value={content.aboutPageBio2}
                onChange={e => setContent(c => ({ ...c, aboutPageBio2: e.target.value }))}
                rows={3}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Bio — Paragraph 3</label>
              <textarea
                value={content.aboutPageBio3}
                onChange={e => setContent(c => ({ ...c, aboutPageBio3: e.target.value }))}
                rows={3}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
              />
            </div>
          </div>
        </div>

        {/* ─── MERCH PAGE ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Merch Page</h2>
          <div className="bg-arden-surface border border-arden-border p-5">
            <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
              Availability Note <span className="normal-case">(banner at top of merch page)</span>
            </label>
            <textarea
              value={content.merchNote}
              onChange={e => setContent(c => ({ ...c, merchNote: e.target.value }))}
              rows={2}
              className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
              placeholder="Merch available at shows..."
            />
          </div>
        </div>

        {/* ─── SHOWS PAGE ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Shows Page</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Empty State Message <span className="normal-case">(when no upcoming shows)</span>
              </label>
              <input
                type="text"
                value={content.showsEmptyMessage}
                onChange={e => setContent(c => ({ ...c, showsEmptyMessage: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="No upcoming shows announced."
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Empty State Subtext
              </label>
              <input
                type="text"
                value={content.showsEmptySubtext}
                onChange={e => setContent(c => ({ ...c, showsEmptySubtext: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="Follow us on Instagram for updates."
              />
            </div>
          </div>
        </div>

        {/* ─── SOCIAL LINKS ─── */}
        <div>
          <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase mb-4">Social Links (site-wide)</h2>
          <div className="space-y-4">
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">Instagram URL</label>
              <input
                type="url"
                value={content.instagramUrl}
                onChange={e => setContent(c => ({ ...c, instagramUrl: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="https://www.instagram.com/ardenjams"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">YouTube URL</label>
              <input
                type="url"
                value={content.youtubeUrl}
                onChange={e => setContent(c => ({ ...c, youtubeUrl: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="https://youtube.com/@ardenjams"
              />
            </div>
            <div className="bg-arden-surface border border-arden-border p-5">
              <label className="block text-xs tracking-widest uppercase text-arden-subtext mb-3">
                Instagram Handle <span className="normal-case">(displayed on about page &amp; footer)</span>
              </label>
              <input
                type="text"
                value={content.instagramHandle}
                onChange={e => setContent(c => ({ ...c, instagramHandle: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                placeholder="@ardenjams"
              />
            </div>
          </div>
        </div>

        {/* ─── OTHER CONTENT LINKS ─── */}
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

export default function ContentPage() {
  return (
    <DashboardGuard requireAdmin>
      <ContentPageContent />
    </DashboardGuard>
  )
}
