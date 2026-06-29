import type { Category, ModelCard, ModelDetail } from './types'

const BASE = import.meta.env.API_URL || 'http://localhost:5001'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await get<{ data: Category[] }>('/api/v2/categories')
  return data
}

export async function getCategory(
  slug: string
): Promise<{ data: Category; models: ModelCard[]; total: number }> {
  return get(`/api/v2/categories/${encodeURIComponent(slug)}`)
}

export async function getModel(slug: string): Promise<ModelDetail> {
  const { data } = await get<{ data: ModelDetail }>(`/api/v2/models/${encodeURIComponent(slug)}`)
  return data
}
