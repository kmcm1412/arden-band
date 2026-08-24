'use client'

import { useState } from 'react'
import { ListMusic, Plus, Trash2, ChevronUp, ChevronDown, Copy } from 'lucide-react'

/**
 * What the band actually played, in order.
 *
 * Kept apart from the planned set list in the `setlists` collection: the plan is
 * what they meant to do and the record is what happened, and flattening the two
 * loses the interesting difference. Rows are editable in place because the usual
 * correction after a show is a typo, not a re-ordering.
 */
export default function ActualSetList({
  songs,
  isAdmin,
  busy,
  plannedSongs,
  onChange,
}: {
  songs: string[]
  isAdmin: boolean
  busy?: boolean
  /** Titles from this show's planned set list, when one exists */
  plannedSongs?: string[]
  onChange: (next: string[]) => void
}) {
  const [rows, setRows] = useState<string[]>(songs)
  const [draft, setDraft] = useState('')

  // Re-sync when the show reloads underneath us, during render not in an effect
  const [synced, setSynced] = useState(songs)
  if (songs !== synced) {
    setSynced(songs)
    setRows(songs)
  }

  const commit = (next: string[]) => {
    setRows(next)
    onChange(next)
  }

  const add = () => {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    commit([...rows, title])
  }

  const move = (i: number, delta: number) => {
    const j = i + delta
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  const remove = (i: number) => commit(rows.filter((_, k) => k !== i))

  const editLocal = (i: number, value: string) =>
    setRows(rs => rs.map((r, k) => (k === i ? value : r)))

  /** Push edits on blur, dropping any row that was emptied out */
  const commitEdits = () => {
    const cleaned = rows.map(r => r.trim()).filter(Boolean)
    const changed = cleaned.length !== songs.length || cleaned.some((r, i) => r !== songs[i])
    if (changed) commit(cleaned)
  }

  const canCopy = (plannedSongs?.length || 0) > 0 && rows.length === 0

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-arden-accent tracking-wider uppercase flex items-center gap-2">
          <ListMusic size={14} /> What We Played
        </h2>
        {rows.length > 0 && (
          <span className="text-arden-subtext text-xs font-mono">
            {rows.length} song{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-arden-subtext text-sm py-5 text-center border border-dashed border-arden-border">
          Nothing logged yet{isAdmin ? ' — add what actually got played.' : '.'}
        </p>
      ) : (
        <ol className="space-y-px">
          {rows.map((song, i) => (
            <li
              key={i}
              className="flex items-center gap-2 p-2 bg-arden-surface border border-arden-border"
            >
              <span className="text-arden-border font-mono text-xs w-6 text-right flex-shrink-0">
                {i + 1}.
              </span>
              <input
                type="text"
                value={song}
                disabled={!isAdmin || busy}
                onChange={e => editLocal(i, e.target.value)}
                onBlur={commitEdits}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                maxLength={120}
                aria-label={`Song ${i + 1}`}
                className="flex-1 min-w-0 bg-transparent text-arden-white text-sm px-2 py-1.5 border border-transparent focus:outline-none focus:border-arden-accent focus:bg-arden-dark disabled:opacity-60"
              />
              {isAdmin && (
                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    aria-label={`Move ${song || 'song'} up`}
                    className="p-1.5 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-25"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={busy || i === rows.length - 1}
                    aria-label={`Move ${song || 'song'} down`}
                    className="p-1.5 text-arden-subtext hover:text-arden-accent transition-colors disabled:opacity-25"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    disabled={busy}
                    aria-label={`Remove ${song || 'song'}`}
                    className="p-1.5 text-arden-subtext hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            disabled={busy}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Add a song…"
            maxLength={120}
            aria-label="Add a song"
            className="flex-1 min-w-[10rem] bg-arden-dark border border-arden-border text-arden-text px-3 py-2 text-sm focus:outline-none focus:border-arden-accent disabled:opacity-60 placeholder:text-arden-border"
          />
          <button
            onClick={add}
            disabled={busy || !draft.trim()}
            className="btn-primary text-xs py-2 px-4 disabled:opacity-40"
          >
            <Plus size={12} /> Add
          </button>
          {canCopy && (
            <button
              onClick={() => commit(plannedSongs!)}
              disabled={busy}
              title="Start from the planned set list, then edit what actually happened"
              className="btn-ghost text-xs py-2 px-4 disabled:opacity-40"
            >
              <Copy size={12} /> Copy the plan ({plannedSongs!.length})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
