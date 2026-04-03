'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { SetList, SetListSong } from '@/lib/types'
import { useAuth } from '@/lib/auth/context'
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react'

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function SetlistsPage() {
  const { membership } = useAuth()
  const isAdmin = membership?.role === 'admin'
  const [setlists, setSetlists] = useState<SetList[]>([])
  const [selected, setSelected] = useState<SetList | null>(null)
  const [newSongTitle, setNewSongTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => { fetchSetlists() }, [])

  const fetchSetlists = async () => {
    const snap = await getDocs(collection(db, 'setlists'))
    const lists = snap.docs.map(d => ({ id: d.id, ...d.data() } as SetList))
    setSetlists(lists)
    if (lists.length > 0 && !selected) setSelected(lists[0])
  }

  const createSetlist = async () => {
    if (!newTitle.trim()) return
    const newList: Omit<SetList, 'id'> = {
      showId: '',
      showTitle: newTitle.trim(),
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const ref = await addDoc(collection(db, 'setlists'), newList)
    const created = { id: ref.id, ...newList }
    setSetlists(prev => [...prev, created])
    setSelected(created)
    setCreating(false)
    setNewTitle('')
  }

  const addSong = async () => {
    if (!selected || !newSongTitle.trim()) return
    const song: SetListSong = {
      id: genId(),
      title: newSongTitle.trim(),
      order: (selected.songs?.length || 0) + 1,
    }
    const updated = { ...selected, songs: [...(selected.songs || []), song], updatedAt: new Date().toISOString() }
    await updateDoc(doc(db, 'setlists', selected.id!), { songs: updated.songs, updatedAt: updated.updatedAt })
    setSelected(updated)
    setSetlists(prev => prev.map(s => s.id === selected.id ? updated : s))
    setNewSongTitle('')
  }

  const removeSong = async (songId: string) => {
    if (!selected) return
    const songs = selected.songs.filter(s => s.id !== songId).map((s, i) => ({ ...s, order: i + 1 }))
    const updated = { ...selected, songs, updatedAt: new Date().toISOString() }
    await updateDoc(doc(db, 'setlists', selected.id!), { songs, updatedAt: updated.updatedAt })
    setSelected(updated)
    setSetlists(prev => prev.map(s => s.id === selected.id ? updated : s))
  }

  const deleteSetlist = async (id: string) => {
    if (!confirm('Delete this set list?')) return
    await deleteDoc(doc(db, 'setlists', id))
    const next = setlists.filter(s => s.id !== id)
    setSetlists(next)
    setSelected(next[0] || null)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Dashboard</p>
        <h1 className="text-2xl font-display font-bold text-arden-white">Set Lists</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Set list selector */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs tracking-widest uppercase text-arden-subtext">Lists</span>
            {isAdmin && (
              <button onClick={() => setCreating(true)} className="text-arden-accent hover:text-arden-white transition-colors">
                <Plus size={16} />
              </button>
            )}
          </div>

          {creating && (
            <div className="mb-2 flex gap-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSetlist()}
                placeholder="Set list name"
                autoFocus
                className="flex-1 bg-arden-surface border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              />
              <button onClick={createSetlist} className="px-3 text-arden-accent hover:text-arden-white">
                <Check size={16} />
              </button>
              <button onClick={() => setCreating(false)} className="px-3 text-arden-subtext hover:text-arden-text">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="space-y-1">
            {setlists.map(list => (
              <div key={list.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => setSelected(list)}
                  className={`flex-1 text-left px-3 py-2.5 text-sm transition-colors ${
                    selected?.id === list.id
                      ? 'bg-arden-muted text-arden-accent'
                      : 'text-arden-subtext hover:text-arden-text hover:bg-arden-surface'
                  }`}
                >
                  {list.showTitle}
                  <span className="ml-2 text-xs opacity-50">{list.songs?.length || 0}</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deleteSetlist(list.id!)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-arden-subtext hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {setlists.length === 0 && !creating && (
              <p className="text-arden-subtext text-sm px-3 py-4">No set lists yet.</p>
            )}
          </div>
        </div>

        {/* Song list */}
        <div className="md:col-span-2">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-arden-white">{selected.showTitle}</h2>
                <span className="text-xs text-arden-subtext">{selected.songs?.length || 0} songs</span>
              </div>

              <div className="space-y-1 mb-4">
                {(selected.songs || []).map((song, i) => (
                  <div key={song.id} className="flex items-center gap-3 p-3 bg-arden-surface border border-arden-border group">
                    <span className="text-xs font-mono text-arden-subtext w-5">{i + 1}</span>
                    <GripVertical size={14} className="text-arden-border" />
                    <span className="flex-1 text-sm text-arden-text">{song.title}</span>
                    {song.key && <span className="text-xs text-arden-subtext border border-arden-border px-2 py-0.5">{song.key}</span>}
                    {isAdmin && (
                      <button
                        onClick={() => removeSong(song.id)}
                        className="opacity-0 group-hover:opacity-100 text-arden-subtext hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {(selected.songs || []).length === 0 && (
                  <p className="text-center py-8 text-arden-subtext text-sm">No songs yet.</p>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    value={newSongTitle}
                    onChange={e => setNewSongTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSong()}
                    placeholder="Song title"
                    className="flex-1 bg-arden-surface border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
                  />
                  <button onClick={addSong} className="btn-primary text-xs py-2 px-4">
                    <Plus size={14} /> Add
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-arden-subtext text-sm">
              Select or create a set list.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
