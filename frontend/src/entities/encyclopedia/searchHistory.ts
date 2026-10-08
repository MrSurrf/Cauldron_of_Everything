import { encyclopediaStorageKey } from './history'

const PREFIX = 'cauldron.encyclopedia.queries.v1:'
const EVENT = 'encyclopedia-queries-change'
const LIMIT = 8
const MAX_AGE = 90 * 24 * 60 * 60 * 1000

export type EncyclopediaSearch = { query: string; searchedAt: number }

export function searchHistoryKey(): string { return encyclopediaStorageKey(PREFIX) }

export function parseSearches(raw: string | null, now = Date.now()): EncyclopediaSearch[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    return data.filter((entry): entry is EncyclopediaSearch => entry && typeof entry === 'object'
      && typeof entry.query === 'string' && entry.query.trim().length > 0 && entry.query.length <= 200
      && typeof entry.searchedAt === 'number' && Number.isFinite(entry.searchedAt)
      && entry.searchedAt > now - MAX_AGE && entry.searchedAt <= now)
      .sort((a, b) => b.searchedAt - a.searchedAt)
      .filter(entry => {
        const key = entry.query.trim().toLocaleLowerCase('ru')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).slice(0, LIMIT)
  } catch { return [] }
}

export function readSearchSnapshot(): string | null {
  try { return localStorage.getItem(searchHistoryKey()) } catch { return null }
}

export function recordSearch(value: string): void {
  const query = value.trim().replace(/\s+/g, ' ')
  if (!query || query.length > 200) return
  try {
    const now = Date.now()
    const entries = parseSearches(JSON.stringify([{ query, searchedAt: now }, ...parseSearches(readSearchSnapshot(), now)]), now)
    localStorage.setItem(searchHistoryKey(), JSON.stringify(entries))
    window.dispatchEvent(new Event(EVENT))
  } catch { /* Поиск работает и без локального хранилища. */ }
}

export function clearSearches(): void {
  try {
    localStorage.removeItem(searchHistoryKey())
    window.dispatchEvent(new Event(EVENT))
  } catch { /* Браузер может запретить хранилище. */ }
}

export function subscribeSearches(callback: () => void): () => void {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
