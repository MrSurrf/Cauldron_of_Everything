// Локальный кэш нужен только для мгновенного показа до ответа сервера.
// Ключ привязан к user_id из JWT, чтобы данные разных аккаунтов не смешивались.

import { getAccessToken } from '../../shared/api/auth'
import type { ProfileData } from './profileModel'
import { normalizeProfile } from './profileModel'

const CACHE_PREFIX = 'profile.cache:'

function cacheKey(): string | null {
  const token = getAccessToken()
  if (!token) return null

  try {
    const encoded = token.split('.')[1]
    if (!encoded) return null
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      sub?: string | number
      user_id?: string | number
    }
    const identity = payload.user_id ?? payload.sub
    return identity === undefined ? null : `${CACHE_PREFIX}${encodeURIComponent(String(identity))}`
  } catch {
    return null
  }
}

export function readProfileCache(): ProfileData | null {
  const key = cacheKey()
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? normalizeProfile(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeProfileCache(profile: ProfileData): void {
  const key = cacheKey()
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(profile))
  } catch {
    // Переполнение localStorage не должно ломать профиль.
  }
}
