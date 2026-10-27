// Кэш содержит только подтверждённый сервером профиль, а не черновик редактора.
// Разделение по JWT используется для локального хранения, не для авторизации.

import type { ProfilePayload } from './account'
import { getAccessToken } from './auth'

const CACHE_PREFIX = 'profile.cache:'
export const PROFILE_CACHE_CHANGED_EVENT = 'account-profile-cache-changed'

export type AccountProfileCacheChange = {
  key: string
  profile: ProfilePayload
}

export function getAccountProfileCacheKey(): string | null {
  try {
    const token = getAccessToken()
    const encoded = token?.split('.')[1]
    if (!encoded) return null
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      sub?: unknown
      user_id?: unknown
    }
    const identity = payload.user_id ?? payload.sub
    if (typeof identity !== 'string' && typeof identity !== 'number') return null
    if (String(identity).length === 0) return null
    return `${CACHE_PREFIX}${encodeURIComponent(String(identity))}`
  } catch {
    return null
  }
}

export function readAccountProfileCache(): ProfilePayload | null {
  const key = getAccountProfileCacheKey()
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    const profile: unknown = raw ? JSON.parse(raw) : null
    return profile && typeof profile === 'object' && !Array.isArray(profile)
      ? profile as ProfilePayload
      : null
  } catch {
    return null
  }
}

export function writeAccountProfileCache(profile: ProfilePayload): void {
  const key = getAccountProfileCacheKey()
  if (!key) return
  const confirmed = { ...profile }
  // Временный URL превью не должен переживать страницу или попадать в хедер.
  if (typeof confirmed.portrait === 'string' && /^(blob|data):/i.test(confirmed.portrait.trim())) confirmed.portrait = null
  try {
    localStorage.setItem(key, JSON.stringify(confirmed))
  } catch {
    // Переполнение localStorage не мешает обновить текущую страницу.
  }
  window.dispatchEvent(new CustomEvent<AccountProfileCacheChange>(PROFILE_CACHE_CHANGED_EVENT, {
    detail: { key, profile: confirmed },
  }))
}
