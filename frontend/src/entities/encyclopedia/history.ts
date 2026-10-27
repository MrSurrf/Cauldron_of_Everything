const PREFIX = 'cauldron.encyclopedia.recent.v1:'
const EVENT = 'encyclopedia-history-change'
const LIMIT = 50
const MAX_AGE = 90 * 24 * 60 * 60 * 1000

export type EncyclopediaVisit = {
  path: string
  title: string
  category: string
  visitedAt: number
  visitCount?: number
}

// ID используется только для разделения локального кеша, не для авторизации.
export function encyclopediaStorageKey(prefix: string): string {
  try {
    for (const key of ['surveyAuth.access', 'surveyAuth.refresh']) {
      const token = localStorage.getItem(key)
      if (!token) continue
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
        const id: unknown = payload.user_id ?? payload.sub
        if (typeof id === 'string' || typeof id === 'number') return prefix + encodeURIComponent(String(id))
      } catch { /* Повреждённый access не мешает проверить refresh. */ }
    }
  } catch { /* Хранилище может быть недоступно в приватном режиме. */ }
  return prefix + 'guest'
}

export function historyKey(): string { return encyclopediaStorageKey(PREFIX) }

export function parseVisits(raw: string | null, now = Date.now()): EncyclopediaVisit[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    return parsed.filter((entry): entry is EncyclopediaVisit => {
      if (!entry || typeof entry !== 'object') return false
      return typeof entry.path === 'string'
        && /^\/encyclopedia\/[a-z0-9][^\s\\#]*$/i.test(entry.path)
        && typeof entry.title === 'string' && entry.title.length > 0 && entry.title.length <= 300
        && typeof entry.category === 'string' && entry.category.length <= 100
        && typeof entry.visitedAt === 'number' && Number.isFinite(entry.visitedAt)
        && entry.visitedAt > now - MAX_AGE && entry.visitedAt <= now
    }).sort((a, b) => b.visitedAt - a.visitedAt).filter((entry) => {
      if (seen.has(entry.path)) return false
      seen.add(entry.path)
      return true
    }).slice(0, LIMIT).map(entry => ({ ...entry, visitCount: typeof entry.visitCount === 'number' && Number.isSafeInteger(entry.visitCount) && entry.visitCount > 0 ? Math.min(entry.visitCount, 1_000_000) : 1 }))
  } catch { return [] }
}

export function readHistorySnapshot(): string | null {
  try { return localStorage.getItem(historyKey()) } catch { return null }
}

export function recordVisit(visit: Omit<EncyclopediaVisit, 'visitedAt' | 'visitCount'>): void {
  try {
    const now = Date.now()
    const previousEntries = parseVisits(readHistorySnapshot(), now)
    const previous = previousEntries.find(entry => entry.path === visit.path)
    // StrictMode и повторный эффект при загрузке не считаются новым открытием.
    const visitCount = previous ? (previous.visitCount ?? 1) + (now - previous.visitedAt >= 1000 ? 1 : 0) : 1
    const entries = parseVisits(JSON.stringify([
      { ...visit, visitedAt: now, visitCount },
      ...previousEntries.filter((entry) => entry.path !== visit.path),
    ]), now)
    localStorage.setItem(historyKey(), JSON.stringify(entries))
    window.dispatchEvent(new Event(EVENT))
  } catch { /* Недоступность кеша не должна мешать чтению энциклопедии. */ }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(historyKey())
    window.dispatchEvent(new Event(EVENT))
  } catch { /* Приватный режим или запрет localStorage. */ }
}

export function subscribeHistory(callback: () => void): () => void {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
