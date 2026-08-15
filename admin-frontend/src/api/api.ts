// Единый API-клиент админки.
// Авторизация — httpOnly-кука (ставит бэкенд); на 401 уводим на /login.

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })

  if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
    throw new ApiError('Сессия истекла', 401)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.error || body?.message || `Ошибка сервера (${res.status})`, res.status)
  }
  return body as T
}

function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ─── Типы ────────────────────────────────────────────────

export interface OrderRow {
  id: number
  name: string
  phone: string
  status: string
  itemsTotal: number
  deliveryCost: number | null
  deliveryRatePerKm: number | null
  deliveryIsFree: boolean
  knownTotal: number
  finalTotalKnown: boolean
  itemsCount: number
  createdAt: string
}

export interface OrderDetail {
  id: number
  name: string
  phone: string
  email: string
  deliveryMethod: string
  deliveryZone: string | null
  deliveryCost: number | null
  deliveryRatePerKm: number | null
  deliveryIsFree: boolean
  transportCompany: string | null
  city: string | null
  street: string | null
  house: string | null
  apartment: string | null
  comment: string | null
  status: string
  itemsTotal: number
  knownTotal: number
  finalTotalKnown: boolean
  createdAt: string
  items: {
    id: number
    quantity: number
    price: number
    partNumber: string
    partName: string
    partSlug: string | null
    models: string[]
  }[]
}

export interface CategoryNode {
  id: number
  name: string
  parentId: number | null
  modelsCount: number
}

export interface ModelRow {
  id: number
  name: string
  slug: string | null
  partsCount: number
}

export interface ModelDetail {
  id: number
  name: string
  slug: string | null
  seoTitle: string | null
  seoDescription: string | null
  h1: string | null
  content: string | null
  isIndexable: boolean
  category: { id: number; name: string; slug: string | null }
  parts: { number: number; id: number; partNumber: string; name: string | null; price: number; availability: boolean }[]
}

export interface PartDetail {
  id: number
  partNumber: string
  name: string | null
  price: number
  availability: boolean
  quantity: number
  slug: string | null
  updatedAt: string | null
  usedIn: { modelId: number; modelName: string; category: string; number: number }[]
}

export interface SearchResult {
  models: { id: number; name: string; category: string }[]
  parts: { id: number; partNumber: string; name: string | null; price: number; availability: boolean }[]
}

export interface CatalogModelRow {
  id: number
  name: string
  slug: string | null
  category: string
  partsCount: number
}

export interface CatalogPartRow {
  id: number
  partNumber: string
  name: string | null
  price: number
  availability: boolean
  modelsCount: number
}

export interface Summary {
  newOrders: number
  ordersWeek: number
  partsTotal: number
  partsNoPrice: number
  modelsTotal: number
  lastPriceRunAt: string | null
  lastBackupAt: string | null
  lastBackupName: string | null
}

export interface PricesStatus {
  files: Record<'result', { uploaded: boolean; uploadedAt: string | null; size: number | null }>
  lastRunAt: string | null
  running: boolean
}

// ─── Auth ────────────────────────────────────────────────

export const login = (loginStr: string, password: string) =>
  send<{ success: true }>('POST', '/api/v2/admin/login', { login: loginStr, password })

export const logout = () => send<{ success: true }>('POST', '/api/v2/admin/logout')

export const checkSession = () => get<{ success: true }>('/api/v2/admin/me')

// ─── Заказы ──────────────────────────────────────────────

export const fetchOrders = (params: {
  status?: string
  phone?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  return get<{ data: OrderRow[]; total: number; page: number; limit: number }>(`/api/v2/admin/orders/?${qs}`)
}

export const fetchOrder = (id: number) => get<{ data: OrderDetail }>(`/api/v2/admin/orders/${id}`)

export const updateOrderStatus = (id: number, status: string) =>
  send<{ data: { id: number; status: string } }>('PATCH', `/api/v2/admin/orders/${id}`, { status })

// ─── Каталог ─────────────────────────────────────────────

export const searchCatalog = (q: string) =>
  get<{ data: SearchResult }>(`/api/v2/admin/catalog/search?q=${encodeURIComponent(q)}`)

export const fetchCategories = () => get<{ data: CategoryNode[] }>('/api/v2/admin/catalog/categories')

export const fetchCategoryModels = (id: number) =>
  get<{ data: ModelRow[] }>(`/api/v2/admin/catalog/categories/${id}/models`)

export const fetchCatalogModels = (params: {
  page?: number
  limit?: number
  sort?: string
  order?: string
}) => {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  }
  return get<{ data: CatalogModelRow[]; total: number; page: number; limit: number }>(
    `/api/v2/admin/catalog/models?${qs}`
  )
}

export const fetchCatalogParts = (params: {
  page?: number
  limit?: number
  price?: string
  sort?: string
  order?: string
}) => {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  }
  return get<{ data: CatalogPartRow[]; total: number; page: number; limit: number }>(
    `/api/v2/admin/catalog/parts?${qs}`
  )
}

export const fetchModel = (id: number) => get<{ data: ModelDetail }>(`/api/v2/admin/catalog/models/${id}`)

export const updateModel = (
  id: number,
  fields: Partial<Pick<ModelDetail, 'name' | 'seoTitle' | 'seoDescription' | 'h1' | 'content' | 'isIndexable'>>
) => send<{ data: ModelDetail }>('PATCH', `/api/v2/admin/catalog/models/${id}`, fields)

export const fetchPart = (id: number) => get<{ data: PartDetail }>(`/api/v2/admin/catalog/parts/${id}`)

export const updatePart = (
  id: number,
  fields: Partial<Pick<PartDetail, 'partNumber' | 'name' | 'price' | 'availability' | 'quantity'>>
) => send<{ data: PartDetail }>('PATCH', `/api/v2/admin/catalog/parts/${id}`, fields)

// ─── Цены / система ──────────────────────────────────────

export const fetchSummary = () => get<{ data: Summary }>('/api/v2/admin/system/summary')

export const fetchPricesStatus = () => get<{ data: PricesStatus }>('/api/v2/admin/prices/status')

export const uploadPriceFile = async (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return request<{ success: true; message: string }>('/api/v2/admin/prices/upload/result', {
    method: 'POST',
    body: fd,
  })
}

export const runPricesUpdate = () => send<{ success: true; report: string }>('POST', '/api/v2/admin/prices/run')

export const runBackup = () => send<{ success: true; message: string }>('POST', '/api/v2/admin/system/backup')
