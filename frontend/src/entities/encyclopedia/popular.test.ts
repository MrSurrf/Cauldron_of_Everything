import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEncyclopedia } from './repository'
import { fetchPopularEncyclopedia } from './popular'

vi.mock('./repository', () => ({ fetchEncyclopedia: vi.fn() }))
const fetchMock = vi.mocked(fetchEncyclopedia)
const entry = { id: 1, name: 'Дракон', name_en: 'Dragon', entity_type: 'creature', slug: 'dragon', opens_count: 100 }

describe('Общий рейтинг энциклопедии', () => {
  beforeEach(() => vi.resetAllMocks())

  it('запрашивает сервер с AbortSignal и сохраняет порядок ответа', async () => {
    const signal = new AbortController().signal
    const page = { count: 2, results: [{ ...entry, id: 2 }, entry] }
    fetchMock.mockResolvedValue(page)
    expect(await fetchPopularEncyclopedia(signal)).toEqual(page)
    expect(fetchMock).toHaveBeenCalledWith('popular/?page_size=20', signal)
  })

  it('принимает пустой рейтинг без выдуманных материалов', async () => {
    fetchMock.mockResolvedValue({ count: 0, results: [] })
    expect(await fetchPopularEncyclopedia(new AbortController().signal)).toEqual({ count: 0, results: [] })
  })

  it.each([
    null, { count: 1, results: null }, { count: -1, results: [] },
    { count: 1, results: [{ ...entry, opens_count: undefined }] },
    { count: 1, results: [{ ...entry, opens_count: -1 }] },
    { count: 1, results: [{ ...entry, id: 0 }] },
  ])('отклоняет некорректный ответ %j', async page => {
    fetchMock.mockResolvedValue(page)
    await expect(fetchPopularEncyclopedia(new AbortController().signal)).rejects.toThrow('Некорректный ответ')
  })

  it('не подменяет ошибку API локальной статистикой', async () => {
    fetchMock.mockRejectedValue(new Error('404'))
    await expect(fetchPopularEncyclopedia(new AbortController().signal)).rejects.toThrow('404')
  })
})
