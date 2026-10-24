import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearHistory, historyKey, parseVisits, readHistorySnapshot, recordVisit } from '../../entities/encyclopedia/history'

const visit = { path: '/encyclopedia/classes', title: 'Классы', category: 'Справочники' }
const token = (id: number) => `header.${btoa(JSON.stringify({ user_id: id }))}.signature`

describe('Локальная история энциклопедии', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('сохраняет открытия и переносит повторно открытую запись в начало без дублей', () => {
    recordVisit(visit)
    recordVisit({ ...visit, path: '/encyclopedia/races', title: 'Расы' })
    recordVisit(visit)
    expect(parseVisits(readHistorySnapshot()).map((entry) => entry.title)).toEqual(['Классы', 'Расы'])
  })

  it('разделяет гостя и аккаунты, сохраняет историю после смены access и очищает только текущую', () => {
    recordVisit(visit)
    localStorage.setItem('surveyAuth.access', token(1))
    expect(parseVisits(readHistorySnapshot())).toEqual([])
    recordVisit({ ...visit, title: 'Первый пользователь' })
    localStorage.setItem('surveyAuth.access', token(2))
    expect(parseVisits(readHistorySnapshot())).toEqual([])
    recordVisit({ ...visit, title: 'Второй пользователь' })
    clearHistory()
    localStorage.setItem('surveyAuth.access', token(1))
    expect(parseVisits(readHistorySnapshot())[0].title).toBe('Первый пользователь')
    localStorage.removeItem('surveyAuth.access')
    expect(parseVisits(readHistorySnapshot())[0].title).toBe('Классы')
  })

  it('проверяет refresh, если access повреждён', () => {
    localStorage.setItem('surveyAuth.access', 'broken')
    localStorage.setItem('surveyAuth.refresh', token(12))
    expect(historyKey()).toMatch(/:12$/)
  })

  it('ограничивает кеш и отбрасывает просроченные, повреждённые и внешние записи', () => {
    const now = Date.now()
    const raw = JSON.stringify([
      ...Array.from({ length: 70 }, (_, id) => ({ ...visit, path: `/encyclopedia/entry/${id}`, visitedAt: now - id })),
      { ...visit, path: 'https://example.com', visitedAt: now },
      { ...visit, path: '/encyclopedia/old', visitedAt: 1 },
      { ...visit, path: '/encyclopedia/future', visitedAt: now + 1000 },
      null,
    ])
    const entries = parseVisits(raw, now)
    expect(entries).toHaveLength(50)
    expect(entries[0].path).toBe('/encyclopedia/entry/0')
    expect(parseVisits('{broken')).toEqual([])
  })

  it('не ломает страницу, если браузер запретил localStorage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') }, setItem: () => { throw new Error('Denied') }, removeItem: () => { throw new Error('Denied') } })
    expect(() => recordVisit(visit)).not.toThrow()
    expect(() => clearHistory()).not.toThrow()
    expect(readHistorySnapshot()).toBeNull()
  })

  it('считает повторные открытия, но не удваивает их при повторном эффекте загрузки', () => {
    vi.useFakeTimers()
    recordVisit(visit)
    recordVisit(visit)
    expect(parseVisits(readHistorySnapshot())[0].visitCount).toBe(1)
    vi.advanceTimersByTime(2000)
    recordVisit(visit)
    expect(parseVisits(readHistorySnapshot())[0].visitCount).toBe(2)
  })

  it('читает прежнюю историю без счётчиков и нормализует повреждённый счётчик', () => {
    const now = Date.now()
    for (const visitCount of [undefined, -4, '100', NaN]) {
      expect(parseVisits(JSON.stringify([{ ...visit, visitedAt: now, visitCount }]), now)[0].visitCount).toBe(1)
    }
  })
})
