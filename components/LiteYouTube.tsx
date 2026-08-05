'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

/**
 * Click-to-play YouTube embed. Renders a thumbnail until clicked, then swaps
 * in the real iframe with autoplay — avoids loading YouTube's player script
 * for every video on the page at once.
 *
 * `vertical` renders a portrait (Shorts) thumbnail: tries the portrait asset
 * first and falls back to the standard 16:9 thumb if YouTube lacks one.
 */
export default function LiteYouTube({
  videoId,
  title,
  vertical = false,
}: {
  videoId: string
  title: string
  vertical?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)

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

  const thumbSrc =
    vertical && !thumbFailed
      ? `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  const buttonSize = vertical ? 'w-12 h-12' : 'w-16 h-16'
  const iconSize = vertical ? 18 : 24

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group/play absolute inset-0 w-full h-full cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbSrc}
        alt={title}
        loading="lazy"
        onError={() => setThumbFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <span className="absolute inset-0 bg-arden-black/30 group-hover/play:bg-arden-black/10 transition-colors" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={`flex items-center justify-center ${buttonSize} rounded-full bg-arden-black/70 border border-arden-accent/60 group-hover/play:bg-arden-accent group-hover/play:border-arden-accent transition-all duration-200`}
        >
          <Play
            size={iconSize}
            className="text-arden-accent group-hover/play:text-arden-black transition-colors ml-1"
            fill="currentColor"
          />
        </span>
      </span>
    </button>
  )
}
