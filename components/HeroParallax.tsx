'use client'

import { useEffect, useRef } from 'react'

/**
 * Full-bleed hero image with a subtle parallax drift: the photo scrolls at a
 * fraction of page speed. The image is overscanned (130% height) so the drift
 * never reveals its edges. Respects prefers-reduced-motion.
 */
export default function HeroParallax() {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight)
        img.style.transform = `translateY(${y * 0.22}px)`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src="/hero-2048.jpg"
      srcSet="/hero-1280.jpg 1280w, /hero-2048.jpg 2048w, /hero-3584.jpg 3584w"
      sizes="100vw"
      alt="Arden performing live — the band on stage under neon ARDEN lettering"
      fetchPriority="high"
      className="absolute left-0 w-full object-cover will-change-transform"
      style={{ top: '-30%', height: '130%', objectPosition: 'center 42%' }}
    />
  )
}
