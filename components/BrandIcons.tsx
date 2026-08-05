// Brand SVG icons shared across the public site (server-safe, no client JS)

export function SoundCloudIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M11.4 8.2c-.3 0-.5.1-.8.2-.2-2.6-2.3-4.6-5-4.6-.7 0-1.3.1-1.9.4-.2.1-.3.2-.3.4V16c0 .2.2.4.4.4h7.6c1.5 0 2.7-1.2 2.7-2.7s-1.2-2.7-2.7-2.7v-2.8zm2.9 8.2h5.1c2 0 3.6-1.6 3.6-3.6s-1.6-3.6-3.6-3.6c-.4 0-.8.1-1.2.2C17.8 6.7 15.6 4.8 13 4.8c-.4 0-.9.1-1.3.2-.2.1-.3.2-.3.4v10.6c0 .2.2.4.4.4h2.5zM.6 10.2c-.1 0-.2.1-.2.2l-.4 2.6.4 2.6c0 .1.1.2.2.2s.2-.1.2-.2l.5-2.6-.5-2.6c0-.1-.1-.2-.2-.2zm2-1.4c-.1 0-.2.1-.2.2L2 13l.4 2.9c0 .1.1.2.2.2s.2-.1.2-.2l.5-2.9-.5-3c0-.1-.1-.2-.2-.2zm2.1-.7c-.2 0-.3.1-.3.3L4 13l.4 3.5c0 .2.1.3.3.3.1 0 .3-.1.3-.3L5.4 13 5 8.4c0-.2-.2-.3-.3-.3z" />
    </svg>
  )
}

export function YouTubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
    </svg>
  )
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.8" cy="6.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
