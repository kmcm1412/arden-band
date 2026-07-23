'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/firebase/client'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query
} from 'firebase/firestore'
import { MerchItem } from '@/lib/types'
import { Plus, Pencil, Trash2, Upload, ImageIcon, Eye, EyeOff } from 'lucide-react'
import DashboardGuard from '@/components/dashboard/DashboardGuard'

const EMPTY_ITEM: Omit<MerchItem, 'id'> = {
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  category: 'Apparel',
  available: true,
}

const CATEGORIES = ['Apparel', 'Accessories', 'Music', 'Other']

function compressImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

function MerchPageContent() {
  const [items, setItems] = useState<MerchItem[]>([])
  const [editing, setEditing] = useState<MerchItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<MerchItem, 'id'>>(EMPTY_ITEM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'merch'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MerchItem)))
    } catch (err) {
      console.error('Failed to load merch:', err)
      setError('Failed to load merch items.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || form.price < 0) return
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, price: Number(form.price) || 0 }
      if (editing?.id) {
        await updateDoc(doc(db, 'merch', editing.id), payload)
      } else {
        await addDoc(collection(db, 'merch'), { ...payload, createdAt: new Date().toISOString() })
      }
      setEditing(null)
      setCreating(false)
      setForm(EMPTY_ITEM)
      fetchItems()
    } catch (err) {
      console.error('Failed to save merch item:', err)
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this merch item?')) return
    try {
      await deleteDoc(doc(db, 'merch', id))
      fetchItems()
    } catch (err) {
      console.error('Failed to delete merch item:', err)
      setError('Failed to delete.')
    }
  }

  const toggleAvailable = async (item: MerchItem) => {
    if (!item.id) return
    try {
      await updateDoc(doc(db, 'merch', item.id), { available: !item.available })
      fetchItems()
    } catch (err) {
      console.error('Failed to toggle availability:', err)
      setError('Failed to update availability.')
    }
  }

  const startEdit = (item: MerchItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl || '',
      category: item.category,
      available: item.available,
    })
    setCreating(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setCreating(false)
    setForm(EMPTY_ITEM)
    setError('')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const dataUrl = await compressImage(file, 800)
      setForm(f => ({ ...f, imageUrl: dataUrl }))
    } catch (err) {
      console.error('Failed to process image:', err)
      setError('Failed to process image.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const showForm = creating || editing !== null

  if (loading) return <div className="p-8 text-arden-subtext">Loading...</div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-arden-subtext text-xs tracking-widest uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-display font-bold text-arden-white">Merch</h1>
          <p className="text-arden-subtext text-sm mt-1">
            Items shown on the public merch page and homepage.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setCreating(true)} className="btn-primary text-xs py-2 px-5">
            <Plus size={14} /> Add Item
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-arden-surface border border-arden-border p-6 mb-6">
          <h2 className="font-medium text-arden-white mb-4">
            {editing ? 'Edit Item' : 'New Item'}
          </h2>

          <div className="flex items-start gap-4 mb-4">
            {form.imageUrl ? (
              <div className="w-28 h-28 flex-shrink-0 bg-arden-dark border border-arden-border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Item" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-28 flex-shrink-0 bg-arden-dark border border-arden-border flex items-center justify-center">
                <ImageIcon size={22} className="text-arden-border" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 bg-arden-muted hover:bg-arden-border text-arden-text text-xs font-medium px-3 py-2 transition-colors disabled:opacity-50"
              >
                <Upload size={12} />
                {uploading ? 'Processing...' : form.imageUrl ? 'Replace Photo' : 'Upload Photo'}
              </button>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                  className="text-xs text-arden-subtext hover:text-red-400 transition-colors text-left"
                >
                  Remove photo
                </button>
              )}
              <p className="text-xs text-arden-subtext max-w-[240px]">
                Square photo recommended. Compressed automatically.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Arden Classic Tee"
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              />
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-arden-text">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                  className="accent-[#c8a96e]"
                />
                Available (unchecked shows &quot;Sold Out&quot;)
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs tracking-widest uppercase text-arden-subtext block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Heavyweight unisex tee. 100% cotton."
                className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}
            </button>
            <button onClick={cancelEdit} className="btn-ghost text-xs py-2 px-5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 && !showForm ? (
        <div className="py-20 text-center">
          <p className="text-arden-subtext">No merch items yet.</p>
          <p className="text-arden-subtext text-xs mt-2">Add your first item — it appears on the public site immediately.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(item => (
            <div key={item.id} className="flex gap-4 p-4 bg-arden-surface border border-arden-border">
              {item.imageUrl ? (
                <div className="w-20 h-20 flex-shrink-0 bg-arden-dark overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 flex-shrink-0 bg-arden-dark flex items-center justify-center">
                  <ImageIcon size={18} className="text-arden-border" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-arden-white text-sm truncate">{item.name}</h3>
                  {!item.available && (
                    <span className="text-[10px] tracking-wider uppercase text-arden-subtext border border-arden-border px-1.5 py-0.5 flex-shrink-0">
                      Sold Out
                    </span>
                  )}
                </div>
                <p className="text-arden-subtext text-xs mt-0.5 truncate">{item.description}</p>
                <p className="text-arden-accent text-sm font-mono mt-1">${item.price}</p>
                <p className="text-arden-border text-[10px] tracking-wider uppercase mt-0.5">{item.category}</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(item)}
                  className="text-arden-subtext hover:text-arden-accent transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleAvailable(item)}
                  className="text-arden-subtext hover:text-arden-accent transition-colors"
                  title={item.available ? 'Mark sold out' : 'Mark available'}
                >
                  {item.available ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  onClick={() => item.id && handleDelete(item.id)}
                  className="text-arden-subtext hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MerchDashboardPage() {
  return (
    <DashboardGuard requireAdmin>
      <MerchPageContent />
    </DashboardGuard>
  )
}
