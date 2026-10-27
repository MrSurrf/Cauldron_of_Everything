import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCreatureBySlug } from './creatureRepository'

afterEach(() => vi.unstubAllGlobals())

describe('полная запись существа из энциклопедии', () => {
  it('находит точный slug и загружает detail только выбранного существа', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.endsWith('/api/encyclopedia/42/')
        ? {
            id: 42, entity_type: 'creature', name: 'Альмираж', name_en: 'Almiraj', slug: 'almiraj-2',
            content_html: '', data: {
              size: 'Маленький', creature_type: 'Зверь', armor_class: '13 (природный доспех)',
              hit_points: '18 (4к6 + 4)', challenge_rating: '1/8',
              sections: [{ id: 'actions', title: 'Действия', html: '<p><strong>Рог.</strong> Атака.</p>' }],
            },
          }
        : { results: [
            { id: 41, entity_type: 'creature', name: 'Альмираж', name_en: 'Almiraj', slug: 'almiraj' },
            { id: 42, entity_type: 'creature', name: 'Альмираж', name_en: 'Almiraj', slug: 'almiraj-2' },
          ] },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const entity = await getCreatureBySlug('almiraj-2', new AbortController().signal)

    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('slug')).toBe('almiraj-2')
    expect(fetchMock.mock.calls[1][0]).toContain('/api/encyclopedia/42/')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(entity).toMatchObject({
      name: 'Альмираж', slug: 'almiraj-2', armorClass: { value: 13 },
      hitPoints: '18 (4к6 + 4)', sections: [{ type: 'actions', title: 'Действия' }],
    })
  })

  it('не запрашивает detail для отсутствующего slug', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ results: [] }) }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await getCreatureBySlug('not-found')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
