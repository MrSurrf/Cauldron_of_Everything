// Локальный кэш нужен только для мгновенного показа до ответа сервера.
// Ключ привязан к user_id из JWT, чтобы данные разных аккаунтов не смешивались.

import { readAccountProfileCache, writeAccountProfileCache } from '../../shared/api/accountProfileCache'
import type { ProfileData } from './profileModel'
import { normalizeProfile } from './profileModel'

export function readProfileCache(): ProfileData | null {
  const profile = readAccountProfileCache()
  return profile ? normalizeProfile(profile) : null
}

export function writeProfileCache(profile: ProfileData): void {
  writeAccountProfileCache(profile)
}
