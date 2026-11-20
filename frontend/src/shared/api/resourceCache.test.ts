import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearResourceCache,
  dedupeResourceRequest,
  readResourceCache,
  writeResourceCache,
} from './resourceCache'

let storage: Map<string, string>

beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => { storage.delete(key) },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('Общий клиентский кэш ресурсов', () => {
  it('сохраняет и читает значение по ключу', () => {
    writeResourceCache('submissions', [{ id: 1 }])
    expect(readResourceCache('submissions')).toEqual([{ id: 1 }])
    expect(storage.keys().next().value).toBe('resource.cache:submissions')
  })

  it('возвращает null для отсутствующего или повреждённого кэша', () => {
    expect(readResourceCache('missing')).toBeNull()
    for (const value of ['not-json', 'null', '[]', '"text"', '5', '{}', '{"value":1}', '{"savedAt":1}']) {
      storage.set('resource.cache:broken', value)
      expect(readResourceCache('broken')).toBeNull()
    }
  })

  it('не падает из-за запрета localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Denied') },
      setItem: () => { throw new Error('Denied') },
      removeItem: () => { throw new Error('Denied') },
    })
    expect(readResourceCache('any')).toBeNull()
    expect(() => writeResourceCache('any', 1)).not.toThrow()
    expect(() => clearResourceCache('any')).not.toThrow()
  })

  it('очищает кэш по ключу и не трогает другие ключи', () => {
    writeResourceCache('a', 1)
    writeResourceCache('b', 2)
    clearResourceCache('a')
    expect(readResourceCache('a')).toBeNull()
    expect(readResourceCache('b')).toBe(2)
  })

  it('дедуплицирует одновременные запросы в один полёт', async () => {
    let resolve: ((value: number) => void) | undefined
    const fetcher = vi.fn(() => new Promise<number>((done) => { resolve = done }))

    const first = dedupeResourceRequest('shared', fetcher)
    const second = dedupeResourceRequest('shared', fetcher)

    resolve!(42)

    await expect(first).resolves.toBe(42)
    await expect(second).resolves.toBe(42)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('сохраняет успешный результат и повторяет запрос после завершения', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')

    await expect(dedupeResourceRequest('key', fetcher)).resolves.toBe('first')
    expect(readResourceCache('key')).toBe('first')

    await expect(dedupeResourceRequest('key', fetcher)).resolves.toBe('second')
    expect(readResourceCache('key')).toBe('second')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('не сохраняет результат при ошибке запроса', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network'))

    await expect(dedupeResourceRequest('failed', fetcher)).rejects.toThrow('network')
    expect(readResourceCache('failed')).toBeNull()

    // Карта полётов очищается: повторный вызов запускает fetcher заново.
    await expect(dedupeResourceRequest('failed', fetcher)).rejects.toThrow('network')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
