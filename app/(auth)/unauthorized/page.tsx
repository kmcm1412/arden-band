'use client'

import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut(auth)
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-arden-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-2xl font-bold tracking-widest text-arden-white hover:text-arden-accent transition-colors block mb-10">
          ARDEN
        </Link>
        <div className="bg-arden-surface border border-arden-border p-8 mb-6">
          <p className="text-arden-accent text-xs tracking-widest uppercase mb-4">Access Restricted</p>
          <h1 className="text-xl font-medium text-arden-white mb-3">Not Approved</h1>
          <p className="text-arden-subtext text-sm leading-relaxed">
            Your account hasn&apos;t been approved for the band portal. Contact the band admin to request access.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="btn-ghost w-full justify-center"
        >
          Sign Out
        </button>
        <Link href="/" className="block mt-4 text-xs text-arden-subtext hover:text-arden-text transition-colors">
          &larr; Back to site
        </Link>
      </div>
    </div>
  )
}
