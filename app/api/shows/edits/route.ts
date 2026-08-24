import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyMember } from '@/lib/auth/verify-member'
import { clearPendingFor } from '@/lib/approvals'
import type { PendingEdit } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Confirms or rejects a pending financial edit.
 *
 * Server-side and transactional on purpose: rejecting restores a snapshot and
 * removes the record in one step, so a half-applied revert is not reachable.
 * It also enforces the one rule the client cannot be trusted with — that the
 * person who made an edit is not the person who signs it off.
 */
export async function POST(req: NextRequest) {
  let actor
  try {
    actor = await verifyMember(req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized'
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 401 })
  }

  try {
    const { showId, editId, action } = await req.json()
    if (typeof showId !== 'string' || !showId || typeof editId !== 'string' || !editId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (action !== 'confirm' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const ref = adminDb.collection('shows').doc(showId)

    const result = await adminDb.runTransaction(async txn => {
      const snap = await txn.get(ref)
      if (!snap.exists) throw new Error('NOT_FOUND')
      const pending = (snap.data()?.pendingEdits || []) as PendingEdit[]
      const edit = pending.find(e => e.id === editId)
      if (!edit) throw new Error('EDIT_NOT_FOUND')
      if (edit.byUid === actor.decoded.uid) throw new Error('SELF_REVIEW')

      const nextPending = clearPendingFor(pending, edit.field)
      if (action === 'confirm') {
        // The value is already live; confirming just closes the record
        txn.update(ref, { pendingEdits: nextPending })
      } else {
        // Put back exactly what was there before the edit
        txn.update(ref, { [edit.field]: edit.previous ?? null, pendingEdits: nextPending })
      }
      return { field: edit.field, summary: edit.summary, previousSummary: edit.previousSummary, by: edit.byName }
    })

    return NextResponse.json({ ok: true, action, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    if (msg === 'EDIT_NOT_FOUND') {
      return NextResponse.json({ error: 'That change was already reviewed' }, { status: 409 })
    }
    if (msg === 'SELF_REVIEW') {
      return NextResponse.json(
        { error: 'Someone else has to sign off on your own change' },
        { status: 403 }
      )
    }
    console.error('[shows] Pending edit review error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
