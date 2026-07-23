'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

/**
 * Click-to-play YouTube embed. Renders a thumbnail until clicked, then swaps
 * in the real iframe with autoplay — avoids loading YouTube's player script
 * for every video on the page at once.
 */
export default function LiteYouTube({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group/play absolute inset-0 w-full h-full cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <span className="absolute inset-0 bg-arden-black/30 group-hover/play:bg-arden-black/10 transition-colors" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-arden-black/70 border border-arden-accent/60 group-hover/play:bg-arden-accent group-hover/play:border-arden-accent transition-all duration-200">
          <Play
            size={24}
            className="text-arden-accent group-hover/play:text-arden-black transition-colors ml-1"
            fill="currentColor"
          />
        </span>
      </span>
    </button>
  )
}
