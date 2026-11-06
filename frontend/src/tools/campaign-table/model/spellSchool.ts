import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import type { InstanceData } from './table'

export function entrySpellSchool(entry: Pick<EncyclopediaEntry, 'summary' | 'data'>): string | undefined {
  for (const data of [entry.data, entry.summary]) {
    const value = data?.school
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

/** Изменённый статблок экземпляра важнее школы исходной карточки. */
export function instanceSpellSchool(data: InstanceData): string | undefined {
  if (data.entityType !== 'spell') return undefined
  return data.statBlock?.kind === 'spell' ? entrySpellSchool(data.statBlock.entry) : data.reference?.school
}

type SchoolRequest = {
  controller: AbortController
  promise: Promise<string | undefined>
  readers: number
  settled: boolean
}
const requests = new Map<string, SchoolRequest>()

/** Старые сохранения не содержат школу: один запрос обслуживает все размещения заклинания. */
export function acquireSpellSchool(entityId: string) {
  let request = requests.get(entityId)
  if (!request) {
    const controller = new AbortController()
    const next: SchoolRequest = {
      controller, readers: 0, settled: false,
      promise: fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(entityId)}/`, controller.signal)
        .then(entry => entry.entity_type === 'spell' ? entrySpellSchool(entry) : undefined)
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
      queueMicrotask(() => {
        if (!current.readers && !current.settled && requests.get(entityId) === current) {
          requests.delete(entityId)
          current.controller.abort()
        }
      })
    },
  }
}
