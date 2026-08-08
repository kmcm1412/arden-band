import Link from 'next/link'
import PublicLayout from '@/components/layout/PublicLayout'
import { getVisibility } from '@/lib/visibility'

export default async function NotFound() {
  const visibility = await getVisibility()
  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex items-center justify-center px-6 pt-24 pb-12">
        <div className="text-center">
          <p className="section-label mb-4">404</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white mb-4">
            This page<br />
            <span className="text-arden-accent">wandered off the setlist.</span>
          </h1>
          <p className="text-arden-subtext mb-10">
            The page you&apos;re looking for doesn&apos;t exist — but the music does.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="btn-primary">
              Back Home
            </Link>
            {visibility.shows && (
              <Link href="/shows" className="btn-ghost">
                See Shows
              </Link>
            )}
            {!visibility.shows && visibility.media && (
              <Link href="/media" className="btn-ghost">
                Watch Videos
              </Link>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
