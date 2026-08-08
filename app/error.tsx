'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-arden-black flex items-center justify-center px-6">
      <div className="text-center">
        <p className="section-label mb-4">Something broke a string</p>
        <h1 className="heading-display text-4xl md:text-6xl text-arden-white mb-4">
          We hit a <span className="text-arden-accent">wrong note.</span>
        </h1>
        <p className="text-arden-subtext mb-10">
          Something went wrong loading this page. Give it another try.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <Link href="/" className="btn-ghost">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
