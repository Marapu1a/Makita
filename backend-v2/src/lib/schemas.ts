// Общие JSON-схемы для валидации params/query (Fastify+Ajv).
// Мусор вроде page=abc или id=xyz отсекается 400-м до хендлера
// и не долетает до Prisma в виде NaN.

export const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

export const slugParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: { slug: { type: 'string', minLength: 1, maxLength: 255 } },
} as const

export function pagingQuerySchema(maxLimit: number) {
  return {
    type: 'object',
    properties: {
      q: { type: 'string', maxLength: 200 },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: maxLimit },
    },
  } as const
}
