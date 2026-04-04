import { ShoppingBag } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Merch — Arden' }

async function getSiteContent() {
  try {
    const doc = await adminDb.collection('siteContent').doc('home').get()
    return doc.exists ? (doc.data() as Record<string, string>) : {}
  } catch {
    return {}
  }
}

const MERCH = [
  {
    id: '1',
    name: 'Arden Classic Tee',
    description: 'Heavyweight unisex tee. 100% cotton.',
    price: 28,
    category: 'Apparel',
    available: true,
    color: 'bg-arden-surface',
  },
  {
    id: '2',
    name: 'Arden Logo Cap',
    description: 'Structured 5-panel. Embroidered logo.',
    price: 24,
    category: 'Accessories',
    available: true,
    color: 'bg-arden-muted',
  },
  {
    id: '3',
    name: 'Tour Hoodie',
    description: 'Fleece pullover. Limited run.',
    price: 55,
    category: 'Apparel',
    available: true,
    color: 'bg-arden-surface',
  },
  {
    id: '4',
    name: 'Demo Vinyl',
    description: '7" vinyl single. Hand-numbered.',
    price: 32,
    category: 'Music',
    available: true,
    color: 'bg-arden-muted',
  },
  {
    id: '5',
    name: 'Arden Tote',
    description: 'Canvas tote bag. Screenprinted.',
    price: 18,
    category: 'Accessories',
    available: true,
    color: 'bg-arden-surface',
  },
  {
    id: '6',
    name: 'Sticker Pack',
    description: 'Set of 5 die-cut stickers.',
    price: 8,
    category: 'Accessories',
    available: true,
    color: 'bg-arden-muted',
  },
]

export default async function MerchPage() {
  const content = await getSiteContent()
  const merchNote = content.merchNote || 'Merch available at shows and through direct order — reach out via the contact form.'

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">Store</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Merch</h1>
        </div>

        <div className="mb-8 p-4 bg-arden-surface border border-arden-border text-sm text-arden-subtext">
          {merchNote}{' '}
          <a href="/about" className="text-arden-accent hover:text-arden-white transition-colors">
            Contact us
          </a>
          .
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
          {MERCH.map((item) => (
            <div key={item.id} className="group">
              <div className={`relative aspect-square ${item.color} flex items-center justify-center mb-4 overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShoppingBag
                    size={32}
                    className="text-arden-border group-hover:text-arden-accent transition-colors"
                  />
                </div>
                {!item.available && (
                  <div className="absolute inset-0 bg-arden-black/60 flex items-center justify-center">
                    <span className="text-xs tracking-widest uppercase text-arden-subtext border border-arden-border px-3 py-1">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs tracking-widest uppercase text-arden-subtext">
                  {item.category}
                </span>
                <h3 className="font-medium text-arden-white mt-1 group-hover:text-arden-accent transition-colors">
                  {item.name}
                </h3>
                <p className="text-arden-subtext text-sm mt-0.5 mb-2">{item.description}</p>
                <p className="text-arden-accent font-mono font-medium">${item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
