'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useAuth } from '@/lib/auth/context'

export default function LoginPage() {
  const router = useRouter()
  const { refreshMembership } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      await refreshMembership()
      router.push('/dashboard')
    } catch (err: any) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      await refreshMembership()
      router.push('/dashboard')
    } catch (err: any) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-arden-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <Link href="/" className="font-display text-2xl font-bold tracking-widest text-arden-white hover:text-arden-accent transition-colors">
            ARDEN
          </Link>
          <p className="text-arden-subtext text-sm mt-2 tracking-wider uppercase">Band Portal</p>
        </div>

        <h1 className="text-xl font-medium text-arden-white mb-6">Sign In</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-arden-surface border border-arden-border text-arden-text px-4 py-3 text-sm focus:outline-none focus:border-arden-accent transition-colors"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-arden-surface border border-arden-border text-arden-text px-4 py-3 text-sm focus:outline-none focus:border-arden-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-arden-border" />
          <span className="text-arden-subtext text-xs tracking-wider">or</span>
          <div className="flex-1 h-px bg-arden-border" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full btn-ghost justify-center text-sm disabled:opacity-50"
        >
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-arden-subtext text-center leading-relaxed">
          Access is by invitation only.<br />
          Contact the band admin to request access.
        </p>
      </div>
    </div>
  )
}

function getErrorMessage(code: string) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.'
    default:
      return 'Sign-in failed. Try again.'
  }
}
