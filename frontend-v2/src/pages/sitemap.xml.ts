import type { APIRoute } from 'astro'

const SITE = import.meta.env.SITE_URL || 'https://makita-remont.ru'

export const GET: APIRoute = async () => {
  const apiBase = import.meta.env.API_URL || 'http://localhost:5001'
  const res = await fetch(`${apiBase}/api/v2/categories/sitemap`)
  if (!res.ok) return new Response('Sitemap unavailable', { status: 502 })

  const { categories, models } = (await res.json()) as {
    categories: string[]
    models: { slug: string; categorySlug: string | null }[]
  }

  const urls: string[] = [
    `${SITE}/`,
    `${SITE}/info`,
    `${SITE}/contacts`,
    ...categories.map((slug) => `${SITE}/${slug}`),
    ...models
      .filter((m) => m.categorySlug)
      .map((m) => `${SITE}/${m.categorySlug}/${m.slug}`),
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
