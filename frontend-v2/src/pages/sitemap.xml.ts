import { API_BASE, SITE_URL } from '../lib/env'
import type { APIRoute } from 'astro'

const SITE = SITE_URL

export const GET: APIRoute = async () => {
  const apiBase = API_BASE
  const [catRes, partsRes] = await Promise.all([
    fetch(`${apiBase}/api/v2/categories/sitemap`),
    fetch(`${apiBase}/api/v2/parts/sitemap`),
  ])
  if (!catRes.ok || !partsRes.ok) return new Response('Sitemap unavailable', { status: 502 })

  const { categories, models } = (await catRes.json()) as {
    categories: string[]
    models: { slug: string; categorySlug: string | null }[]
  }
  const { parts } = (await partsRes.json()) as { parts: string[] }

  const urls: string[] = [
    `${SITE}/`,
    `${SITE}/info`,
    `${SITE}/contacts`,
    ...categories.map((slug) => `${SITE}/${slug}`),
    ...models
      .filter((m) => m.categorySlug)
      .map((m) => `${SITE}/${m.categorySlug}/${m.slug}`),
    ...parts.map((slug) => `${SITE}/parts/${slug}`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
