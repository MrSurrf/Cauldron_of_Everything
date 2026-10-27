import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCampaignWikiImageAccountScope } from './accountScope'

let storage: Map<string, string>

function token(claims: object) {
  return `header.${btoa(JSON.stringify(claims))}.signature`
}

beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('Область локальных изображений wiki', () => {
  it('разделяет аккаунты по user_id и безопасно кодирует ключ', () => {
    storage.set('surveyAuth.access', token({ user_id: 'user/one two' }))
    expect(getCampaignWikiImageAccountScope()).toBe('user%2Fone%20two')
    storage.set('surveyAuth.access', token({ user_id: 42 }))
    expect(getCampaignWikiImageAccountScope()).toBe('42')
  })

  it('использует refresh после повреждённого access', () => {
    storage.set('surveyAuth.access', 'expired')
    storage.set('surveyAuth.refresh', token({ sub: 'stable-owner' }))
    expect(getCampaignWikiImageAccountScope()).toBe('stable-owner')
  })

  it('изолирует гостя при отсутствии пригодной идентичности или localStorage', () => {
    storage.set('surveyAuth.access', token({ user_id: { unexpected: true } }))
    expect(getCampaignWikiImageAccountScope()).toBe('guest')
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') } })
    expect(getCampaignWikiImageAccountScope()).toBe('guest')
  })
})

