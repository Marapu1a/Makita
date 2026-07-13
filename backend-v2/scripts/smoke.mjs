// Смоук после деплоя: node scripts/smoke.mjs [base-url]
// Локально:  node scripts/smoke.mjs http://localhost:5001
// Прод:      node scripts/smoke.mjs https://makita-remont.ru
// Проверяет живость API без записи в БД (заказ шлётся заведомо невалидный — ждём 400).

const BASE = (process.argv[2] || 'http://localhost:5001').replace(/\/$/, '')
// на проде API живёт за прокси фронта: /api/v2 тот же
const api = (p) => `${BASE}${p}`

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`  ok   ${name}`)
  } catch (e) {
    failed++
    console.log(`  FAIL ${name}: ${e.message}`)
  }
}

const getJson = async (path, expect = 200) => {
  const res = await fetch(api(path))
  if (res.status !== expect) throw new Error(`${path} → ${res.status} (ждали ${expect})`)
  return expect === 200 ? res.json() : null
}

console.log(`Смоук против ${BASE}`)

await check('health', async () => {
  const res = await fetch(api('/health'))
  if (!res.ok) throw new Error(`status ${res.status}`)
})

let firstModel = null
await check('категории', async () => {
  const { data } = await getJson('/api/v2/categories')
  if (!data?.length) throw new Error('пустой список категорий')
})

await check('категория со слагом + модели', async () => {
  const { data } = await getJson('/api/v2/categories')
  const cat = data.find((c) => c.slug)
  const catPage = await getJson(`/api/v2/categories/${cat.slug}`)
  const withModels = catPage.models?.length ? catPage : null
  if (withModels) firstModel = withModels.models[0]
})

await check('страница модели по слагу', async () => {
  if (!firstModel?.slug) {
    // первая категория могла быть родительской без моделей — берём известную модель
    const search = await getJson('/api/v2/models/search?q=GA4600')
    firstModel = search.data?.[0]
  }
  if (!firstModel?.slug) throw new Error('не нашли модель для проверки')
  const model = await getJson(`/api/v2/models/${firstModel.slug}`)
  if (!model.data?.name) throw new Error('модель без данных')
})

await check('поиск деталей', async () => {
  const res = await getJson('/api/v2/parts/search?q=265995')
  if (!res.data) throw new Error('нет поля data')
})

await check('деталь по слагу', async () => {
  const search = await getJson('/api/v2/parts/search?q=265995-6')
  const slug = search.data?.[0]?.slug
  if (!slug) throw new Error('деталь 265995-6 не найдена поиском')
  const part = await getJson(`/api/v2/parts/by-slug/${slug}`)
  if (!part.data?.partNumber) throw new Error('деталь без данных')
})

await check('sitemap-источники', async () => {
  const cats = await getJson('/api/v2/categories/sitemap')
  const parts = await getJson('/api/v2/parts/sitemap')
  if (!cats.models?.length || !parts.parts?.length) throw new Error('пустые данные sitemap')
})

await check('заказ: невалидное тело отклоняется (400)', async () => {
  const res = await fetch(api('/api/v2/orders/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'smoke', items: [] }),
  })
  if (res.status !== 400) throw new Error(`→ ${res.status} (ждали 400)`)
})

await check('заказ: page=abc в поиске отклоняется (400)', async () => {
  await getJson('/api/v2/parts/search?q=xx&page=abc', 400)
})

console.log(failed ? `\nПРОВАЛЕНО проверок: ${failed}` : '\nВсе проверки пройдены')
process.exit(failed ? 1 : 0)
