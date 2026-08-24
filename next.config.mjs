/**
 * Only the hosts this site actually talks to:
 *   apis.google.com / gstatic / *.firebaseapp.com  Firebase Auth popup flow
 *   *.googleapis.com                               Firestore and token exchange
 *   youtube + ytimg                                video embeds and thumbnails
 *   w.soundcloud.com                               the player on the homepage
 *
 * script-src keeps 'unsafe-inline' because Next.js ships inline hydration
 * scripts; replacing that with per-request nonces needs middleware and would
 * force every page dynamic. Framing, plugin content, form targets and base URI
 * stay locked regardless, so an injected external script still has nowhere to
 * go.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://*.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com",
  "font-src 'self' data:",
  "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebasestorage.googleapis.com https://www.googleapis.com wss://*.firebaseio.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://w.soundcloud.com https://accounts.google.com https://ardenapp-d8ff5.firebaseapp.com",
  "media-src 'self' https://w.soundcloud.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No eslint/typescript escape hatches: with them set, a type error or a lint
  // error still shipped to production. The build is the gate.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
    ],
  },
  async redirects() {
    return [
      {
        // Old address keeps working but lands on the real domain
        source: '/:path*',
        has: [{ type: 'host', value: 'ardenjams.netlify.app' }],
        destination: 'https://ardenband.com/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    // These have to live here rather than in netlify.toml: every page is
    // server-rendered, so the HTML comes out of a Netlify function, and
    // netlify.toml [[headers]] only decorate static file responses. That file
    // still handles asset caching, which is static by definition.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ]
  },
}

export default nextConfig
