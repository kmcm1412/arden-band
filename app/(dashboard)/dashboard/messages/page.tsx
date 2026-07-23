'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import {
  collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query
} from 'firebase/firestore'
import { ContactMessage } from '@/lib/types'
import { Mail, MailOpen, Trash2 } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

function MessagesPageContent() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { fetchMessages() }, [])

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ContactMessage)))
    } catch (err) {
      console.error('Failed to load messages:', err)
      setError('Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }

  const openMessage = async (msg: ContactMessage) => {
    if (!msg.id) return
    setExpanded(expanded === msg.id ? null : msg.id)
    if (!msg.read) {
      try {
        await updateDoc(doc(db, 'contactMessages', msg.id), { read: true })
        setMessages(ms => ms.map(m => (m.id === msg.id ? { ...m, read: true } : m)))
      } catch (err) {
        console.error('Failed to mark read:', err)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return
    try {
      await deleteDoc(doc(db, 'contactMessages', id))
      setMessages(ms => ms.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('Failed to delete.')
    }
  }

  const unread = messages.filter(m => !m.read).length

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">Messages</h1>
        <p className="text-arden-subtext text-sm mt-1">
          Contact form submissions from the public site
          {unread > 0 && <span className="text-arden-accent"> · {unread} unread</span>}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="py-20 text-center">
          <Mail size={28} className="mx-auto text-arden-border mb-4" />
          <p className="text-arden-subtext">No messages yet.</p>
          <p className="text-arden-subtext text-xs mt-2">The contact form is on the About page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`bg-arden-surface border transition-colors ${
                msg.read ? 'border-arden-border' : 'border-arden-accent/50'
              }`}
            >
              <button
                onClick={() => openMessage(msg)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <span className={msg.read ? 'text-arden-border' : 'text-arden-accent'}>
                  {msg.read ? <MailOpen size={16} /> : <Mail size={16} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm truncate ${msg.read ? 'text-arden-text' : 'text-arden-white font-medium'}`}>
                    {msg.name} <span className="text-arden-subtext font-normal">· {msg.email}</span>
                  </span>
                  <span className="block text-arden-subtext text-xs truncate mt-0.5">
                    {msg.message}
                  </span>
                </span>
                {msg.createdAt && (
                  <span className="text-arden-border text-xs font-mono flex-shrink-0">
                    {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </button>

              {expanded === msg.id && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-arden-text text-sm whitespace-pre-wrap leading-relaxed border-t border-arden-border pt-3">
                    {msg.message}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <a
                      href={`mailto:${msg.email}?subject=Re: your message to Arden`}
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Reply by Email
                    </a>
                    <button
                      onClick={() => msg.id && handleDelete(msg.id)}
                      className="flex items-center gap-1.5 text-xs text-arden-subtext hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  return (
    <DashboardGuard>
      <MessagesPageContent />
    </DashboardGuard>
  )
}
