/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { adminDb } from '@/lib/firebase/admin'
import { getVisibility } from '@/lib/visibility'
import { getSiteContent } from '@/lib/site-content'
import type { MerchItem } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Merch — Arden',
  description: 'Arden band merch — tees, caps, and more. Available at shows and by direct order.',
}

async function getMerch(): Promise<MerchItem[]> {
  try {
    const snap = await adminDb.collection('merch').orderBy('createdAt', 'desc').get()
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<MerchItem, 'id'>) }))
  } catch (err) {
    console.error('[merch] Failed to fetch merch:', err)
    return []
  }
}

export default async function MerchPage() {
  const visibility = await getVisibility()
  if (!visibility.merch) notFound()

  const [content, items] = await Promise.all([getSiteContent(), getMerch()])
  const merchNote = content.merchNote || 'Merch available at shows and through direct order — reach out via the contact form.'

  return (
    <div className="pt-24 pb-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="section-label mb-3">Store</p>
          <h1 className="heading-display text-5xl md:text-7xl text-arden-white">Merch</h1>
        </div>

        {items.length > 0 ? (
          <>
            <div className="mb-8 p-4 bg-arden-surface border border-arden-border text-sm text-arden-subtext">
              {merchNote}{' '}
              <a href="/about" className="text-arden-accent hover:text-arden-white transition-colors">
                Contact us
              </a>
              .
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
              {items.map((item) => (
                <div key={item.id} className="group">
                  <div className="relative aspect-square bg-arden-surface flex items-center justify-center mb-4 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ShoppingBag
                        size={32}
                        className="text-arden-border group-hover:text-arden-accent transition-colors"
                      />
                    )}
                    {!item.available && (
                      <div className="absolute inset-0 bg-arden-black/60 flex items-center justify-center">
                        <span className="text-xs tracking-widest uppercase text-arden-white border border-arden-muted px-3 py-1 bg-arden-black/60">
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
                    {item.description && (
                      <p className="text-arden-subtext text-sm mt-0.5 mb-2">{item.description}</p>
                    )}
                    <p className="text-arden-accent font-mono font-medium">${item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <ShoppingBag size={32} className="mx-auto text-arden-border mb-4" />
            <p className="text-arden-subtext text-lg">Merch is coming soon.</p>
            <p className="text-arden-subtext text-sm mt-2">
              Catch us at a show, or{' '}
              <a href="/about" className="text-arden-accent hover:text-arden-white transition-colors">
                reach out
              </a>{' '}
              to get first dibs.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
