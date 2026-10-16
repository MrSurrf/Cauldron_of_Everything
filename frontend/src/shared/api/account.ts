// API профиля и настроек аккаунта. Источник истины — бэкенд (таблица accounts.Profile).

import { authFetch } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

// Поля профиля (зеркало ProfileData из pages/profile/profileModel.ts)
// плюс свободный namespace настроек инструментов. Все поля необязательны:
// сервер делает merge поверх уже сохранённых данных.
export type ProfilePayload = {
  name?: string
  tagline?: string
  city?: string
  title?: string
  role?: string
  bio?: string
  quote?: string
  theme?: string
  visibility?: string
  messages?: string
  systems?: string[]
  styles?: string[]
  genres?: string[]
  links?: { label: string; value: string }[]
  privacy?: Record<string, boolean>
  settings?: Record<string, unknown>
}

export type ProfileResponse = {
  data: ProfilePayload
  updated_at: string
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  const detail = typeof body?.detail === 'string' ? body.detail : null
  return new Error(detail ?? `${fallback}: HTTP ${response.status}`)
}

export async function getProfile(): Promise<ProfileResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/me/profile/`)
  if (!response.ok) throw await readError(response, 'Не удалось загрузить профиль')
  return response.json() as Promise<ProfileResponse>
}

export async function patchProfile(data: ProfilePayload): Promise<ProfileResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/me/profile/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!response.ok) throw await readError(response, 'Не удалось сохранить профиль')
  return response.json() as Promise<ProfileResponse>
}
