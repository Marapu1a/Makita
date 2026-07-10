import { API_BASE } from './lib/env'
import { defineMiddleware } from 'astro:middleware'

// Прокси к backend-v2 (как nginx на старом сайте):
//  /images/* — статика (SVG-оверлеи, webp запрашиваются браузером по относительному пути)
//  /api/*    — клиентские запросы (заказ, поиск)
export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url
  const apiBase = API_BASE

  if (pathname.startsWith('/images/')) {
    try {
      const res = await fetch(`${apiBase}${pathname}${ctx.url.search}`)
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

  if (pathname.startsWith('/api/')) {
    try {
      const res = await fetch(`${apiBase}${pathname}${ctx.url.search}`, {
        method: ctx.request.method,
        headers: { 'content-type': ctx.request.headers.get('content-type') || 'application/json' },
        body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : await ctx.request.arrayBuffer(),
      })
      const body = await res.arrayBuffer()
      return new Response(body, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
      })
    } catch {
      return new Response(JSON.stringify({ success: false, message: 'API недоступен' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  return next()
})
