// API профиля и настроек аккаунта. Источник истины — бэкенд (таблица accounts.Profile).

import { authFetch } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export type ProfileVisibility = 'all' | 'friends' | 'none'

export type ProfilePrivacy = {
  online: boolean
  activity: boolean
  articles: boolean
  characters: boolean
  followers: boolean
  city: boolean
}

export type ProfileLink = {
  label: string
  value: string
}

export type ProfileData = {
  name: string
  tagline: string
  city: string
  title: string
  role: string
  bio: string
  portrait: string | null
  theme: string
  visibility: ProfileVisibility
  messages: ProfileVisibility
  systems: string[]
  styles: string[]
  genres: string[]
  links: ProfileLink[]
  privacy: ProfilePrivacy
}

// Все поля необязательны: сервер делает shallow merge поверх сохранённых данных.
export type ProfilePayload = Partial<ProfileData> & {
  settings?: Record<string, unknown>
}

export type ProfileResponse = {
  data: ProfilePayload
  updated_at: string
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null)

  function firstMessage(value: unknown): string | null {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      for (const item of value) {
        const message = firstMessage(item)
        if (message) return message
      }
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) {
        const message = firstMessage(item)
        if (message) return message
      }
    }
    return null
  }

  return new Error(firstMessage(body) ?? `${fallback}: HTTP ${response.status}`)
}

export async function getProfile(signal?: AbortSignal): Promise<ProfileResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/me/profile/`, { signal })
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

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('portrait', file)
  const response = await authFetch(`${API_BASE_URL}/api/me/profile/avatar/`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) throw await readError(response, 'Не удалось загрузить аватар')
  const body = (await response.json()) as { portrait?: string }
  if (!body.portrait) throw new Error('Сервер не вернул URL аватара')
  return body.portrait
}
