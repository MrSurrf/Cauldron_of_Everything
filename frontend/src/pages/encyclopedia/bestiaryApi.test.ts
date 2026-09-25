import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBestiaryCreature, loadBestiary } from './bestiaryApi'

afterEach(() => vi.unstubAllGlobals())

describe('загрузка бестиария', () => {
  it('собирает каталог из list API без единого запроса detail', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain('/api/encyclopedia/?')
      const payload = {
        count: 2,
        results: [
          { id: 7, entity_type: 'creature', name: 'Горный орёл', slug: 'mountain-eagle',
            summary: { challenge_rating: '1/4', size: 'Маленький', creature_type: 'Зверь', languages: ['Общий'], habitat: ['Горы'], speed: 'полёт 60 фт.', named_npc: true, is_homebrew: false } },
          { id: 8, entity_type: 'creature', name: 'Тараск', slug: 'tarrasque', summary: { challenge_rating: '30' } },
        ],
      }
      return { ok: true, json: async () => payload }
    })
    vi.stubGlobal('fetch', fetchMock)

    const catalog = await loadBestiary(new AbortController().signal)

    expect(catalog).toHaveLength(1)
    expect(catalog[0]).toMatchObject({
      name: 'Горный орёл', challengeRating: '1/4', languages: ['Общий'],
      habitats: ['Горы'], movements: ['Полёт'], namedNpc: true, contentText: '',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('page_size=1000')
  })

  it('передаёт текст поиска в q и запрашивает detail только при выборе существа', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.endsWith('/api/encyclopedia/7/')
        ? { id: 7, entity_type: 'creature', name: 'Горный орёл', slug: 'mountain-eagle',
            content_text: 'Опытный исследователь.', data: { armor_class: 15, hit_points: 18 } }
        : { count: 1, results: [{ id: 7, entity_type: 'creature', name: 'Горный орёл', slug: 'mountain-eagle',
            summary: { challenge_rating: '1/4', size: 'Маленький' } }] },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const [creature] = await loadBestiary(new AbortController().signal, 'исследователь')
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('q')).toBe('исследователь')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const selected = await getBestiaryCreature(creature, new AbortController().signal)
    expect(selected.entity.armorClass?.value).toBe(15)
    expect(fetchMock.mock.calls[1][0]).toContain('/api/encyclopedia/7/')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('собирает несколько страниц каталога без detail-запросов', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        count: 1001,
        results: [url.includes('page=2')
          ? { id: 2, entity_type: 'creature', name: 'Болотник', slug: 'bolotnik', summary: { size: 'Большой' } }
          : { id: 1, entity_type: 'creature', name: 'Альмираж', slug: 'almiraj', summary: { size: 'Маленький' } }],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const catalog = await loadBestiary(new AbortController().signal)

    expect(catalog.map(({ name }) => name)).toEqual(['Альмираж', 'Болотник'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.every(([url]) => url.includes('/api/encyclopedia/?'))).toBe(true)
  })
})
