import { authFetch } from '../../shared/api/auth'

export type EncyclopediaEntry = {
  id: number
  name: string
  name_en: string
  entity_type: string
  slug: string
  content_text?: string
  content_html?: string
  summary?: Record<string, unknown>
  data?: Record<string, unknown>
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function fetchEncyclopedia<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await authFetch(`${API_BASE_URL}/api/encyclopedia/${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Не удалось загрузить материалы (HTTP ${response.status}).`)
  return response.json() as Promise<T>
}
