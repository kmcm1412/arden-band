import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

// Temporary one-time endpoint to seed the media collection.
// Protected by BOOTSTRAP_SECRET. Remove after use.
export async function POST(req: NextRequest) {
  const secret = process.env.BOOTSTRAP_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (body.secret !== secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    const videos = [
      {
        youtubeId: 'AQE2FQjxXkg',
        title: 'Fur Elise Jam — Live @ Hometown Tavern',
        description: 'Arden takes Beethoven somewhere unexpected. Live at Hometown Tavern.',
        featured: true,
        createdAt: '2025-11-26T00:00:00.000Z',
      },
      {
        youtubeId: 'z5HiNb2jdYw',
        title: 'Arden Live | 11/26/25 — Hometown Tavern',
        description: 'Full set from Hometown Tavern. November 2025.',
        featured: false,
        createdAt: '2025-11-26T00:00:01.000Z',
      },
      {
        youtubeId: 'Xs-BpQJ1AjI',
        title: 'Arden Live @ 89 North | Full Set',
        description: 'Full set live at 89 North. November 2025.',
        featured: false,
        createdAt: '2025-11-20T00:00:00.000Z',
      },
      {
        youtubeId: 'C4rFX6-DNlw',
        title: 'Shakedown Street w/ Improv Jam — Grateful Dead Cover',
        description: 'Grateful Dead cover with an extended improv section.',
        featured: false,
        createdAt: '2025-11-01T00:00:00.000Z',
      },
      {
        youtubeId: '34DWImjNzX8',
        title: 'Creep — Radiohead Cover',
        description: 'Arden\'s take on the Radiohead classic.',
        featured: false,
        createdAt: '2025-10-30T00:00:00.000Z',
      },
      {
        youtubeId: 'KSEUFrKTEG4',
        title: 'Scarlet Begonias / Fire on the Mountain — Grateful Dead',
        description: 'The classic Grateful Dead medley, live.',
        featured: false,
        createdAt: '2025-10-29T00:00:00.000Z',
      },
      {
        youtubeId: 'qRQiDm3ZtBI',
        title: 'Thriller / Another Brick in the Wall — Cover Mashup',
        description: 'Michael Jackson meets Pink Floyd. A mashup only Arden could pull off.',
        featured: false,
        createdAt: '2025-10-28T00:00:02.000Z',
      },
      {
        youtubeId: '6m3qzOtQEq8',
        title: 'Mr. Charlie — Grateful Dead Cover',
        description: 'A Grateful Dead gem, live.',
        featured: false,
        createdAt: '2025-10-28T00:00:01.000Z',
      },
      {
        youtubeId: 'DGT52eU5eLw',
        title: 'Opening / Deal — 10/28/25',
        description: 'Live opener from October 28, 2025.',
        featured: false,
        createdAt: '2025-10-28T00:00:00.000Z',
      },
      {
        youtubeId: 'uWH43GlSxbU',
        title: 'Me and My Uncle — 10/20/25',
        description: 'Grateful Dead classic, live October 2025.',
        featured: false,
        createdAt: '2025-10-20T00:00:00.000Z',
      },
    ]

    const col = adminDb.collection('media')
    const results = []
    for (const video of videos) {
      const ref = await col.add(video)
      results.push(ref.id)
    }

    return NextResponse.json({ ok: true, added: results.length, ids: results })
  } catch (err) {
    console.error('Seed media error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
