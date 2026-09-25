import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadBestiary } from './bestiaryApi'

afterEach(() => vi.unstubAllGlobals())

describe('загрузка бестиария', () => {
  it('собирает существ из API, загружает поля фасетов и не заменяет локального Тараска', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const payload = url.endsWith('/api/encyclopedia/7/')
        ? {
            id: 7, entity_type: 'creature', name: 'Горный орёл', slug: 'mountain-eagle',
            sources: ['Бестиарий'], content_text: 'Живёт в высоких горах.',
            data: { challenge_rating: '1/4', size: 'Маленький', creature_type: 'Зверь', languages: ['Общий'], habitat: ['Горы'], speed: 'полёт 60 фт.' },
          }
        : {
            count: 2,
            results: [
              { id: 7, entity_type: 'creature', name: 'Горный орёл', slug: 'mountain-eagle', summary: { challenge_rating: '1/4', size: 'Маленький' } },
              { id: 8, entity_type: 'creature', name: 'Тараск', slug: 'tarrasque', summary: { challenge_rating: '30' } },
            ],
          }
      return { ok: true, json: async () => payload }
    })
    vi.stubGlobal('fetch', fetchMock)
    const onList = vi.fn()
    const onProgress = vi.fn()

    const catalog = await loadBestiary(new AbortController().signal, onList, onProgress)

    expect(onList.mock.calls[0][0]).toHaveLength(1)
    expect(catalog).toHaveLength(1)
    expect(catalog[0]).toMatchObject({
      name: 'Горный орёл', challengeRating: '1/4', languages: ['Общий'],
      habitats: ['Горы'], movements: ['Полёт'], contentText: 'Живёт в высоких горах.',
    })
    expect(onProgress).toHaveBeenLastCalledWith(1, 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
