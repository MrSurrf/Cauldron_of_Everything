import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSearches, parseSearches, readSearchSnapshot, recordSearch } from '../../entities/encyclopedia/searchHistory'

describe('Недавние запросы энциклопедии', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('нормализует пробелы и повторяет запрос без дублей, игнорируя регистр', () => {
    recordSearch('  Огненный   шар ')
    recordSearch('Тараск')
    recordSearch('огненный шар')
    expect(parseSearches(readSearchSnapshot()).map(entry => entry.query)).toEqual(['огненный шар', 'Тараск'])
    recordSearch(' ')
    recordSearch('a'.repeat(201))
    expect(parseSearches(readSearchSnapshot())).toHaveLength(2)
  })

  it('ограничивает историю, отбрасывает будущие, старые и повреждённые записи', () => {
    const now = Date.now()
    const entries = Array.from({ length: 20 }, (_, index) => ({ query: `Запрос ${index}`, searchedAt: now - index }))
    expect(parseSearches(JSON.stringify([...entries, null, { query: 'старый', searchedAt: 1 }, { query: 'будущий', searchedAt: now + 10 }]), now)).toHaveLength(8)
    expect(parseSearches('{broken')).toEqual([])
  })

  it('разделяет аккаунты и очищает запросы только текущего пользователя', () => {
    recordSearch('гость')
    const token = (id: number) => `header.${btoa(JSON.stringify({ user_id: id }))}.signature`
    localStorage.setItem('surveyAuth.access', token(1))
    expect(parseSearches(readSearchSnapshot())).toEqual([])
    recordSearch('первый')
    localStorage.setItem('surveyAuth.access', token(2))
    recordSearch('второй')
    clearSearches()
    expect(parseSearches(readSearchSnapshot())).toEqual([])
    localStorage.setItem('surveyAuth.access', token(1))
    expect(parseSearches(readSearchSnapshot())[0].query).toBe('первый')
    localStorage.removeItem('surveyAuth.access')
    expect(parseSearches(readSearchSnapshot())[0].query).toBe('гость')
  })

  it('не блокирует поиск при недоступном localStorage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Denied') }, setItem: () => { throw new Error('Denied') }, removeItem: () => { throw new Error('Denied') } })
    expect(() => recordSearch('Тараск')).not.toThrow()
    expect(() => clearSearches()).not.toThrow()
    expect(readSearchSnapshot()).toBeNull()
  })
})
