import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAccountProfileCacheKey,
  PROFILE_CACHE_CHANGED_EVENT,
  readAccountProfileCache,
  writeAccountProfileCache,
} from './accountProfileCache'
import type { AccountProfileCacheChange } from './accountProfileCache'

let storage: Map<string, string>
const token = (claims: object) => `header.${btoa(JSON.stringify(claims))}.signature`

beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
  vi.stubGlobal('window', new EventTarget())
})

afterEach(() => vi.unstubAllGlobals())

describe('Общий кэш подтверждённого профиля', () => {
  it('читает существующие ключи без изменения данных и не смешивает аккаунты', () => {
    storage.set('surveyAuth.access', token({ user_id: 7 }))
    storage.set('profile.cache:7', JSON.stringify({ name: 'Игрок', portrait: '/media/avatar.png' }))
    expect(getAccountProfileCacheKey()).toBe('profile.cache:7')
    expect(readAccountProfileCache()).toEqual({ name: 'Игрок', portrait: '/media/avatar.png' })
    storage.set('surveyAuth.access', token({ user_id: 8 }))
    expect(readAccountProfileCache()).toBeNull()
  })

  it('поддерживает sub, кодирует идентификатор и не создаёт гостевой кэш', () => {
    storage.set('surveyAuth.access', token({ sub: 'user/with spaces' }))
    expect(getAccountProfileCacheKey()).toBe('profile.cache:user%2Fwith%20spaces')
    storage.delete('surveyAuth.access')
    writeAccountProfileCache({ name: 'Гость' })
    expect(storage.size).toBe(0)
    expect(getAccountProfileCacheKey()).toBeNull()
  })

  it('не падает из-за повреждённого токена, кэша или запрета localStorage', () => {
    storage.set('surveyAuth.access', 'invalid-token')
    expect(readAccountProfileCache()).toBeNull()
    storage.set('surveyAuth.access', token({ user_id: 'valid' }))
    for (const value of ['not-json', 'null', '[]', '"text"']) {
      storage.set('profile.cache:valid', value)
      expect(readAccountProfileCache()).toBeNull()
    }
    storage.set('surveyAuth.access', token({ user_id: { unsafe: true } }))
    expect(getAccountProfileCacheKey()).toBeNull()
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') } })
    expect(readAccountProfileCache()).toBeNull()
    expect(() => writeAccountProfileCache({ portrait: null })).not.toThrow()
  })

  it('передаёт новое подтверждённое значение подписчикам даже при переполненном хранилище', () => {
    storage.set('surveyAuth.access', token({ user_id: 42 }))
    let detail: AccountProfileCacheChange | undefined
    window.addEventListener(PROFILE_CACHE_CHANGED_EVENT, event => { detail = (event as CustomEvent<AccountProfileCacheChange>).detail })
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: () => { throw new Error('Quota exceeded') },
    })
    writeAccountProfileCache({ portrait: '/media/confirmed.png' })
    expect(detail).toEqual({ key: 'profile.cache:42', profile: { portrait: '/media/confirmed.png' } })
  })

  it('не сохраняет временные URL превью и не изменяет исходный объект', () => {
    storage.set('surveyAuth.access', token({ user_id: 5 }))
    const profile = { portrait: 'blob:temporary-portrait' }
    writeAccountProfileCache(profile)
    expect(profile.portrait).toBe('blob:temporary-portrait')
    expect(readAccountProfileCache()?.portrait).toBeNull()
    writeAccountProfileCache({ portrait: 'data:image/png;base64,preview' })
    expect(readAccountProfileCache()?.portrait).toBeNull()
  })
})
