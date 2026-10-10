// Локальный кэш профиля: нужен только чтобы страница не мигала при перезагрузке,
// пока идёт запрос к серверу. Источником истины остаётся бэкенд.

import { AUTH_CHANGED_EVENT, getAccessToken } from '../../shared/api/auth'
import type { ProfileData } from './profileModel'

const CACHE_KEY = 'profile.cache'

export function readProfileCache(): ProfileData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ProfileData) : null
  } catch {
    return null
  }
}

export function writeProfileCache(profile: ProfileData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile))
  } catch {
    // Переполнение localStorage не должно ломать профиль.
  }
}

// При выходе из аккаунта чужой кэш не должен показываться следующему пользователю.
export function bindProfileCacheToAuth(): void {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (!getAccessToken()) localStorage.removeItem(CACHE_KEY)
  })
}
