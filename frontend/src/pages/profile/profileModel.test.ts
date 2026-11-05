import { describe, expect, it } from 'vitest'

import { emptyProfile, normalizeProfile } from './profileModel'

describe('normalizeProfile', () => {
  it('keeps a new server profile empty instead of adding demo data', () => {
    expect(normalizeProfile({})).toEqual(emptyProfile)
  })

  it('merges partial privacy data with safe defaults', () => {
    const profile = normalizeProfile({
      name: 'Лира',
      privacy: { city: false },
    })

    expect(profile.name).toBe('Лира')
    expect(profile.privacy).toEqual({
      online: true,
      activity: true,
      articles: true,
      characters: true,
      followers: true,
      city: false,
    })
  })

  it('ignores malformed cached collections and invalid select values', () => {
    const profile = normalizeProfile({
      systems: ['D&D', 42],
      links: [{ label: 'Сайт', value: 'https://example.test' }, { label: 1 }],
      visibility: 'public',
    })

    expect(profile.systems).toEqual([])
    expect(profile.links).toEqual([{ label: 'Сайт', value: 'https://example.test' }])
    expect(profile.visibility).toBe('all')
  })
})
