import Link from 'next/link'
import { Camera, Play } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export default async function Footer() {
  const content = await getSiteContent()
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'

  return (
    <footer className="border-t border-arden-border mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-display text-lg font-bold tracking-widest text-arden-white">
              ARDEN
            </span>
            <p className="text-arden-subtext text-xs mt-1 tracking-wider">
              © {new Date().getFullYear()} Arden. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <Camera size={18} />
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arden-subtext hover:text-arden-accent transition-colors"
            >
              <Play size={18} />
            </a>
          </div>

          <nav className="flex items-center gap-6 text-xs tracking-wider uppercase text-arden-subtext">
            <Link href="/shows" className="hover:text-arden-text transition-colors">Shows</Link>
            <Link href="/merch" className="hover:text-arden-text transition-colors">Merch</Link>
            <Link href="/about" className="hover:text-arden-text transition-colors">About</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
