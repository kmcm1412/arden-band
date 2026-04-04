import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { getStorage } from 'firebase-admin/storage'

export const dynamic = 'force-dynamic'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
  const token = authHeader.slice(7)
  const decoded = await adminAuth.verifyIdToken(token)
  const membership = await adminDb.collection('memberships').doc(decoded.uid).get()
  if (!membership.exists || membership.data()?.role !== 'admin' || !membership.data()?.active) {
    throw new Error('Forbidden')
  }
  return decoded
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 })
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = getStorage().bucket()
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${path}.${ext}`
    const fileRef = bucket.file(filePath)

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    })

    await fileRef.makePublic()
    const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`

    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
