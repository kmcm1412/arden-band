import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone: string) {
  return /^\+?[\d\s\-().]{7,20}$/.test(phone)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, name } = body

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 })
    }

    // Keyed by email so duplicate signups are idempotent (upsert)
    const docRef = adminDb.collection('subscribers').doc(email.toLowerCase())
    const existing = await docRef.get()

    if (existing.exists) {
      // Update phone/name if provided but don't reset subscribed date
      const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
      if (phone) update.phone = phone.trim()
      if (name) update.name = name.trim()
      await docRef.update(update)
      return NextResponse.json({ ok: true })
    }

    await docRef.set({
      email: email.toLowerCase().trim(),
      ...(name ? { name: name.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
      subscribedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
