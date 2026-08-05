import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 5

/**
 * Firestore-backed per-IP throttle (serverless instances share no memory).
 * Best-effort: a throttle failure never blocks a legitimate message.
 */
async function isRateLimited(req: NextRequest): Promise<boolean> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    // Sanitize for use as a doc id
    const key = 'contact:' + ip.replace(/[^a-zA-Z0-9.:_-]/g, '')
    const ref = adminDb.collection('rateLimits').doc(key)
    const now = Date.now()
    const doc = await ref.get()
    const data = doc.data()
    if (data && now - data.windowStart < RATE_WINDOW_MS) {
      if (data.count >= RATE_MAX) return true
      await ref.update({ count: data.count + 1 })
    } else {
      await ref.set({ count: 1, windowStart: now })
    }
    return false
  } catch (err) {
    console.error('Rate limit check failed:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    if (await isRateLimited(req)) {
      return NextResponse.json({ error: 'Too many messages — please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const { name, email, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: 'Input too long' }, { status: 400 })
    }

    await adminDb.collection('contactMessages').add({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}
