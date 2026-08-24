'use client'

import { ShieldAlert, Check, X } from 'lucide-react'
import type { PendingEdit } from '@/lib/types'
import { FIELD_LABELS } from '@/lib/approvals'
import { formatInEastern } from '@/lib/utils'

/** A small "waiting on someone" tag, shown beside the section it belongs to */
export function PendingTag({ edit }: { edit?: PendingEdit }) {
  if (!edit) return null
  return (
    <span
      title={`${edit.byName} changed this — another member needs to sign off`}
      className="text-[10px] tracking-wider uppercase px-2 py-0.5 border border-yellow-700 text-yellow-500"
    >
      Pending
    </span>
  )
}

/**
 * Financial changes made by someone outside the trusted list, waiting on a
 * second pair of eyes.
 *
 * The numbers on this page already include them — holding the changes back
 * would leave the editor staring at figures they know are wrong. What this
 * panel does is make it obvious which ones nobody has checked, and give any
 * other member a one-tap way to agree or put it back.
 */
export default function PendingEditsPanel({
  edits,
  currentUid,
  busyId,
  onReview,
}: {
  edits: PendingEdit[]
  currentUid?: string
  busyId?: string | null
  onReview: (edit: PendingEdit, action: 'confirm' | 'reject') => void
}) {
  if (edits.length === 0) return null

  const ordered = [...edits].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <div className="mb-10 border border-yellow-700/50 bg-yellow-900/10">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-700/40">
        <ShieldAlert size={14} className="text-yellow-500 flex-shrink-0" />
        <h2 className="text-sm font-medium text-yellow-500 tracking-wider uppercase">
          {edits.length} change{edits.length === 1 ? '' : 's'} awaiting sign-off
        </h2>
      </div>

      <p className="text-arden-subtext text-xs px-4 pt-3 leading-relaxed">
        These are already counted in the totals above. Another member confirms them, or puts
        them back the way they were.
      </p>

      <div className="p-4 space-y-3">
        {ordered.map(edit => {
          const mine = edit.byUid === currentUid
          const busy = busyId === edit.id
          return (
            <div key={edit.id} className="bg-arden-surface border border-arden-border p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
                <span className="text-arden-accent text-xs tracking-widest uppercase">
                  {FIELD_LABELS[edit.field] || edit.field}
                </span>
                <span className="text-arden-subtext text-xs">
                  by {edit.byName} · {formatInEastern(edit.at, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-sm text-arden-text">
                <span className="text-arden-subtext line-through">{edit.previousSummary}</span>
                <span className="text-arden-border mx-2">→</span>
                <span className="text-arden-white">{edit.summary}</span>
              </p>

              <div className="flex items-center gap-3 mt-3">
                {mine ? (
                  <p className="text-arden-subtext text-xs">
                    Your change — someone else has to sign off on it.
                  </p>
                ) : (
                  <>
                    <button
                      onClick={() => onReview(edit, 'confirm')}
                      disabled={busy}
                      className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                    >
                      <Check size={12} /> Confirm
                    </button>
                    <button
                      onClick={() => onReview(edit, 'reject')}
                      disabled={busy}
                      className="text-arden-subtext hover:text-red-400 transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <X size={12} /> Put it back
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
