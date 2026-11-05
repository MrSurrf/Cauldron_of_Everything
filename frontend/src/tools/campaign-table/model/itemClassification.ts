import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import type { InstanceData } from './table'

export function entryItemClassification(entry: Pick<EncyclopediaEntry, 'summary' | 'data'>): string | undefined {
  for (const data of [entry.data, entry.summary]) {
    for (const key of ['classification', 'item_type', 'type', 'category']) {
      const value = data?.[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return undefined
}

/** Изменённый статблок экземпляра важнее сохранённого вида оригинала. */
export function instanceItemClassification(data: InstanceData): string | undefined {
  if (data.entityType !== 'item') return undefined
  return data.statBlock?.kind === 'item' ? entryItemClassification(data.statBlock.entry) : data.reference?.classification
}

type ClassificationRequest = {
  controller: AbortController
  promise: Promise<string | undefined>
  readers: number
  settled: boolean
}
const requests = new Map<string, ClassificationRequest>()

/** Старые сохранения не содержат вид: один запрос обслуживает все размещения предмета. */
export function acquireItemClassification(entityId: string) {
  let request = requests.get(entityId)
  if (!request) {
    const controller = new AbortController()
    const next: ClassificationRequest = {
      controller, readers: 0, settled: false,
      promise: fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(entityId)}/`, controller.signal)
        .then(entry => entry.entity_type === 'item' ? entryItemClassification(entry) : undefined)
        .then(value => { next.settled = true; return value }, error => {
          if (requests.get(entityId) === next) requests.delete(entityId)
          throw error
        }),
    }
    request = next
    requests.set(entityId, request)
  }
  request.readers += 1
  const current = request
  return {
    promise: current.promise,
    release: () => {
      current.readers -= 1
      // Повторное подключение StrictMode и смена геометрии используют тот же запрос.
      queueMicrotask(() => {
        if (!current.readers && !current.settled && requests.get(entityId) === current) {
          requests.delete(entityId)
          current.controller.abort()
        }
      })
    },
  }
}
