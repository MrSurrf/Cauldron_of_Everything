// Общий клиентский кэш для GET-запросов.
// Паттерн cache-then-network: страница мгновенно показывает сохранённое
// значение из localStorage, а свежие данные подтягивает фоновым запросом.
// Одновременные запросы по одному ключу дедуплицируются в один Promise.

type CacheEntry<T> = {
  value: T
  savedAt: number
}

function storageKey(key: string): string {
  return `resource.cache:${key}`
}

export function readResourceCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
    if (!('value' in entry) || typeof entry.savedAt !== 'number') return null
    return entry.value
  } catch {
    return null
  }
}

export function writeResourceCache<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { value, savedAt: Date.now() }
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry))
  } catch {
    // Переполнение хранилища не должно ломать загрузку данных.
  }
}

export function clearResourceCache(key: string): void {
  try {
    localStorage.removeItem(storageKey(key))
  } catch {
    // Кэш необязателен.
  }
}

const inflight = new Map<string, Promise<unknown>>()

// Выполняет fetcher для ключа не чаще одного раза в пределах одного полёта
// запроса: повторные вызовы получают тот же Promise. Успешный результат
// сохраняется в кэш.
export function dedupeResourceRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  // finally отработает до resolve промиса, поэтому удалять запись
  // из inflight можно без дополнительной проверки.
  const request = (async () => {
    try {
      const value = await fetcher()
      writeResourceCache(key, value)
      return value
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, request)
  return request
}
