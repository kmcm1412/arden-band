import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Arden — Long Island Jam Band',
  description:
    'Official website of Arden, a Long Island-based jam band. Upcoming shows, live videos, merch, and updates.',
  openGraph: {
    title: 'Arden — Long Island Jam Band',
    description:
      'Official website of Arden, a Long Island-based jam band. Upcoming shows, live videos, merch, and updates.',
    type: 'website',
    images: ['/hero-banner.jpeg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-arden-black text-arden-text antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
