import { API_BASE } from './lib/env'
import { defineMiddleware } from 'astro:middleware'

// Прокси к backend-v2 (как nginx на старом сайте):
//  /images/* — статика (SVG-оверлеи, webp запрашиваются браузером по относительному пути)
//  /api/*    — клиентские запросы (заказ, поиск)
export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url
  const apiBase = API_BASE

  // Реальный IP посетителя — иначе rate-limit бэкенда видит все запросы
  // как один IP прокси и банит посетителей скопом
  let clientIp = ''
  try {
    clientIp = ctx.clientAddress
  } catch {
    /* clientAddress недоступен при пререндере */
  }
  const fwdHeaders: Record<string, string> = {}
  if (clientIp) {
    fwdHeaders['x-forwarded-for'] = clientIp
    fwdHeaders['x-forwarded-proto'] = ctx.url.protocol.replace(':', '')
  }

  if (pathname.startsWith('/images/')) {
    try {
      // Пробрасываем условные заголовки: браузер кэширует, но перепроверяет
      // свежесть (иначе fetch() SVG-оверлеев не обновить даже Ctrl+F5)
      const condHeaders: Record<string, string> = { ...fwdHeaders }
      const inm = ctx.request.headers.get('if-none-match')
      const ims = ctx.request.headers.get('if-modified-since')
      if (inm) condHeaders['if-none-match'] = inm
      if (ims) condHeaders['if-modified-since'] = ims

      const res = await fetch(`${apiBase}${pathname}${ctx.url.search}`, { headers: condHeaders })
      if (res.status === 304) return new Response(null, { status: 304 })
      if (!res.ok) return new Response(null, { status: res.status })

      const headers: Record<string, string> = {
        'content-type': res.headers.get('content-type') || 'application/octet-stream',
        'cache-control': 'public, no-cache', // кэшируй, но валидируй по etag
      }
      const etag = res.headers.get('etag')
      const lm = res.headers.get('last-modified')
      if (etag) headers['etag'] = etag
      if (lm) headers['last-modified'] = lm

      const body = await res.arrayBuffer()
      return new Response(body, { status: res.status, headers })
    } catch {
      return new Response(null, { status: 502 })
    }
  }

  if (pathname.startsWith('/api/')) {
    try {
      const res = await fetch(`${apiBase}${pathname}${ctx.url.search}`, {
        method: ctx.request.method,
        headers: {
          'content-type': ctx.request.headers.get('content-type') || 'application/json',
          ...fwdHeaders,
        },
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
