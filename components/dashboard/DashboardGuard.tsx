'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

export default function DashboardGuard({ children, requireAdmin = false }: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { user, membership, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!membership || !membership.active) {
      router.replace('/unauthorized')
      return
    }
    if (requireAdmin && membership.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [user, membership, loading, router, requireAdmin])

  if (loading) {
    return (
      <div className="min-h-screen bg-arden-black flex items-center justify-center">
        <div className="text-arden-subtext text-sm tracking-wider">Loading...</div>
      </div>
    )
  }

  if (!user || !membership || !membership.active) return null
  if (requireAdmin && membership.role !== 'admin') return null

  return <>{children}</>
}
