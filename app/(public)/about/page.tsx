import { Camera, Play } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import ContactForm from '@/components/ContactForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'About — Arden' }

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export default async function AboutPage() {
  const content = await getSiteContent()

  const aboutPageHeading = content.aboutPageHeading || 'Arden is an indie rock band playing original music.'
  const aboutPageBio1 = content.aboutPageBio1 || 'Formed through shared obsessions with sound and performance, Arden has spent their time building something real — not a genre exercise, but a body of work that reflects who they are.'
  const aboutPageBio2 = content.aboutPageBio2 || 'The songs are lived in. The performances are committed. The band shows up with something to say and the chops to say it.'
  const aboutPageBio3 = content.aboutPageBio3 || 'Based out of the Northeast, they play wherever the rooms are right and the people are ready.'
  const instagramUrl = content.instagramUrl || 'https://www.instagram.com/ardenjams'
  const youtubeUrl = content.youtubeUrl || 'https://youtube.com/@ardenjams'
  const instagramHandle = content.instagramHandle || '@ardenjams'

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
              {aboutPageHeading}
            </h2>
            <div className="space-y-4 text-arden-subtext leading-relaxed">
              <p>{aboutPageBio1}</p>
              <p>{aboutPageBio2}</p>
              <p>{aboutPageBio3}</p>
            </div>

            <div className="flex gap-4 mt-8">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors text-sm"
              >
                <Camera size={16} />
                {instagramHandle}
              </a>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-arden-subtext hover:text-arden-accent transition-colors text-sm"
              >
                <Play size={16} />
                {instagramHandle}
              </a>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="border-t border-arden-border pt-16">
          <div className="max-w-2xl">
            <p className="section-label mb-3">Get in Touch</p>
            <h2 className="heading-display text-3xl text-arden-white mb-8">Contact</h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
