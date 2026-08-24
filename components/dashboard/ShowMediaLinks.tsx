'use client'

import { useState } from 'react'
import { Video, Share2, Plus, Trash2, ExternalLink, AlertTriangle } from 'lucide-react'
import type { ShowRecording, SocialPost } from '@/lib/types'
import { normalizeUrl, detectPlatform, detectRecordingSource, RECORDING_TYPES } from '@/lib/links'

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}

const BAD_URL = "That doesn't look like a web link — paste the full URL."

/**
 * Recordings from the night.
 *
 * Add and remove only: a link is either right or replaced, and inline editing a
 * URL invites half-typed values getting saved. Every URL goes through
 * normalizeUrl first, so nothing that isn't http(s) becomes a clickable anchor.
 */
export function ShowRecordings({
  recordings,
  isAdmin,
  busy,
  onChange,
}: {
  recordings: ShowRecording[]
  isAdmin: boolean
  busy?: boolean
  onChange: (next: ShowRecording[]) => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<string>(RECORDING_TYPES[0])
  const [error, setError] = useState('')

  const add = () => {
    const safe = normalizeUrl(url)
    if (!safe) {
      setError(BAD_URL)
      return
    }
    setError('')
    const entry: ShowRecording = {
      id: genId(),
      // A link with no label still needs something to click on
      title: title.trim() || detectRecordingSource(safe),
      url: safe,
      ...(type ? { type } : {}),
    }
    setTitle('')
    setUrl('')
    onChange([...recordings, entry])
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
          <Video size={14} /> Recordings
        </h2>
        {recordings.length > 0 && (
          <span className="text-arden-subtext text-xs font-mono">{recordings.length}</span>
        )}
      </div>

      {recordings.length === 0 ? (
        <p className="text-arden-subtext text-sm py-5 text-center border border-dashed border-arden-border">
          No recordings yet{isAdmin ? ' — add a link to audio or video.' : '.'}
        </p>
      ) : (
        <div className="space-y-px">
          {recordings.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 bg-arden-surface border border-arden-border"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-arden-white text-sm hover:text-arden-accent transition-colors inline-flex items-center gap-1.5 max-w-full"
                >
                  <span className="truncate">{r.title}</span>
                  <ExternalLink size={11} className="flex-shrink-0" />
                </a>
                <p className="text-arden-subtext text-xs truncate">
                  {detectRecordingSource(r.url)}
                  {r.type && ` · ${r.type}`}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => onChange(recordings.filter(x => x.id !== r.id))}
                  disabled={busy}
                  aria-label={`Remove ${r.title}`}
                  className="text-arden-subtext hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 bg-arden-surface border border-arden-border p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={title}
              disabled={busy}
              onChange={e => setTitle(e.target.value)}
              placeholder="Label (optional)"
              maxLength={120}
              aria-label="Recording label"
              className="bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60 placeholder:text-arden-border"
            />
            <select
              value={type}
              disabled={busy}
              onChange={e => setType(e.target.value)}
              aria-label="Recording type"
              className="bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60"
            >
              {RECORDING_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <input
            type="url"
            inputMode="url"
            value={url}
            disabled={busy}
            onChange={e => {
              setUrl(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="https://youtube.com/…"
            aria-label="Recording URL"
            className="w-full mt-3 bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60 placeholder:text-arden-border"
          />
          {error && (
            <p className="flex items-center gap-2 text-red-400 text-xs mt-2">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
          <button
            onClick={add}
            disabled={busy || !url.trim()}
            className="btn-primary text-xs py-2 px-5 mt-3 disabled:opacity-40"
          >
            <Plus size={12} /> Add recording
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Posts about the show. The platform is read off the URL's host at save time
 * rather than asked for, since the link already says where it lives.
 */
export function ShowSocialPosts({
  posts,
  isAdmin,
  busy,
  onChange,
}: {
  posts: SocialPost[]
  isAdmin: boolean
  busy?: boolean
  onChange: (next: SocialPost[]) => void
}) {
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const preview = url.trim() ? normalizeUrl(url) : null

  const add = () => {
    const safe = normalizeUrl(url)
    if (!safe) {
      setError(BAD_URL)
      return
    }
    setError('')
    const entry: SocialPost = {
      id: genId(),
      url: safe,
      platform: detectPlatform(safe),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    setUrl('')
    setNote('')
    onChange([...posts, entry])
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
          <Share2 size={14} /> Social Posts
        </h2>
        {posts.length > 0 && (
          <span className="text-arden-subtext text-xs font-mono">{posts.length}</span>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-arden-subtext text-sm py-5 text-center border border-dashed border-arden-border">
          Nothing linked yet{isAdmin ? ' — paste a post about the show.' : '.'}
        </p>
      ) : (
        <div className="space-y-px">
          {posts.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 bg-arden-surface border border-arden-border"
            >
              <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 border border-arden-border text-arden-subtext flex-shrink-0">
                {p.platform}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-arden-white text-sm hover:text-arden-accent transition-colors inline-flex items-center gap-1.5 max-w-full"
                >
                  <span className="truncate">{p.note || p.url}</span>
                  <ExternalLink size={11} className="flex-shrink-0" />
                </a>
                {p.note && <p className="text-arden-subtext text-xs truncate">{p.url}</p>}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onChange(posts.filter(x => x.id !== p.id))}
                  disabled={busy}
                  aria-label={`Remove ${p.platform} post`}
                  className="text-arden-subtext hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 bg-arden-surface border border-arden-border p-4">
          <input
            type="url"
            inputMode="url"
            value={url}
            disabled={busy}
            onChange={e => {
              setUrl(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="https://instagram.com/p/…"
            aria-label="Post URL"
            className="w-full bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60 placeholder:text-arden-border"
          />
          <input
            type="text"
            value={note}
            disabled={busy}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Note (optional)"
            maxLength={160}
            aria-label="Post note"
            className="w-full mt-3 bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60 placeholder:text-arden-border"
          />
          {error && (
            <p className="flex items-center gap-2 text-red-400 text-xs mt-2">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={add}
              disabled={busy || !url.trim()}
              className="btn-primary text-xs py-2 px-5 disabled:opacity-40"
            >
              <Plus size={12} /> Add post
            </button>
            {preview && (
              <span className="text-arden-subtext text-xs">
                Reads as {detectPlatform(preview)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
