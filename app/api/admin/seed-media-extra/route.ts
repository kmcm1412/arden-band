import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const EXTRA_VIDEOS = [
  {
    youtubeId: '-zJcpKO9nVo',
    title: 'Shakedown Street — Grateful Dead Cover',
    description: 'Live cover of Shakedown Street by the Grateful Dead.',
    featured: false,
  },
  {
    youtubeId: 'rH8KQ7dRXHg',
    title: 'How We Doing?',
    description: 'Arden live.',
    featured: false,
  },
  {
    youtubeId: 'd2NB-PI2LuE',
    title: 'Tomorrow Never Knows — Beatles Cover (Live)',
    description: 'Live cover of Tomorrow Never Knows by The Beatles.',
    featured: false,
  },
  {
    youtubeId: 'ShOH9CRAKe8',
    title: 'What Song Is This?',
    description: 'Arden live.',
    featured: false,
  },
  {
    youtubeId: 'G58fN0WiCfI',
    title: 'Mr. Charlie — Grateful Dead Cover',
    description: 'Live cover of Mr. Charlie by the Grateful Dead.',
    featured: false,
  },
]

export async function POST(req: NextRequest) {
  const secret = process.env.BOOTSTRAP_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 403 })

  const body = await req.json()
  if (body.secret !== secret) return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })

  const results: string[] = []
  for (const video of EXTRA_VIDEOS) {
    const ref = adminDb.collection('media').doc(video.youtubeId)
    const existing = await ref.get()
    if (existing.exists) {
      results.push(`skipped (already exists): ${video.youtubeId}`)
      continue
    }
    await ref.set({ ...video, createdAt: FieldValue.serverTimestamp() })
    results.push(`added: ${video.youtubeId} — ${video.title}`)
  }

  return NextResponse.json({ ok: true, results })
}
