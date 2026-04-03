'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Membership } from '@/lib/types'

interface AuthContextType {
  user: User | null
  membership: Membership | null
  loading: boolean
  refreshMembership: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  membership: null,
  loading: true,
  refreshMembership: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMembership = async (u: User) => {
    try {
      const res = await fetch('/api/auth/membership', {
        headers: { Authorization: `Bearer ${await u.getIdToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMembership(data.membership)
      } else {
        setMembership(null)
      }
    } catch {
      setMembership(null)
    }
  }

  const refreshMembership = async () => {
    if (user) await fetchMembership(user)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        await fetchMembership(u)
      } else {
        setMembership(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, membership, loading, refreshMembership }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
