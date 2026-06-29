import { defineMiddleware } from 'astro:middleware'

// Проксируем /images/* к backend-v2 — браузер запрашивает SVG-оверлеи по относительному пути
export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.url.pathname.startsWith('/images/')) {
    const apiBase = import.meta.env.API_URL || 'http://localhost:5001'
    const upstream = `${apiBase}${ctx.url.pathname}${ctx.url.search}`
    try {
      const res = await fetch(upstream)
      if (!res.ok) return new Response(null, { status: res.status })
      const body = await res.arrayBuffer()
      return new Response(body, {
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') || 'application/octet-stream',
          'cache-control': 'public, max-age=86400',
        },
      })
    } catch {
      return new Response(null, { status: 502 })
    }
  }
  return next()
})
