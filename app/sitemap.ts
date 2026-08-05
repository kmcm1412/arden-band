import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getVisibility } from '@/lib/visibility'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const visibility = await getVisibility()
  const now = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly' as const, priority: 1 },
    ...(visibility.shows
      ? [{ url: `${SITE_URL}/shows`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9 }]
      : []),
    ...(visibility.media
      ? [{ url: `${SITE_URL}/media`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 }]
      : []),
    ...(visibility.merch
      ? [{ url: `${SITE_URL}/merch`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 }]
      : []),
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${SITE_URL}/links`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
  ]
}
