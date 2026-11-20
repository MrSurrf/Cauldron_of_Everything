import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import type { InstanceData } from './table'

type SpellEntry = Pick<EncyclopediaEntry, 'summary' | 'data'>

export type SpellNodeTraits = {
  school?: string
  level?: number
  ritual?: boolean
  concentration?: boolean
}

function field(entry: SpellEntry, key: string): unknown {
  for (const data of [entry.data, entry.summary]) {
    const value = data?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function fieldText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const item = value as Record<string, unknown>
  for (const key of ['name', 'title', 'label', 'value']) {
    const text = fieldText(item[key])
    if (text) return text
  }
  return ''
}

export function spellLevel(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : undefined
  const text = fieldText(value).toLocaleLowerCase('ru-RU')
  if (!text) return undefined
  if (/^(?:заговор|cantrip)$/.test(text)) return 0
  const match = text.match(/\d+/)
  const level = match ? Number(match[0]) : Number.NaN
  return Number.isSafeInteger(level) && level >= 0 ? level : undefined
}

export function spellFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 1) return true
  if (value === 0) return false
  const text = fieldText(value).toLocaleLowerCase('ru-RU')
  if (/^(?:true|yes|да|1)$/.test(text)) return true
  if (/^(?:false|no|нет|0)$/.test(text)) return false
  return undefined
}

export function entrySpellSchool(entry: SpellEntry): string | undefined {
  const value = fieldText(field(entry, 'school'))
  return value || undefined
}

export function entrySpellTraits(entry: SpellEntry): SpellNodeTraits {
  const school = entrySpellSchool(entry)
  const level = spellLevel(field(entry, 'level'))
  const ritual = spellFlag(field(entry, 'ritual')) ?? false
  const explicitConcentration = spellFlag(field(entry, 'concentration'))
  const duration = fieldText(field(entry, 'duration'))
  const concentration = explicitConcentration ?? /концентрац|concentration/i.test(duration)
  return {
    ...(school ? { school } : {}),
    ...(level !== undefined ? { level } : {}),
    ritual,
    concentration,
  }
}

/** Изменённый статблок экземпляра важнее признаков исходной карточки. */
export function instanceSpellTraits(data: InstanceData): SpellNodeTraits {
  if (data.entityType !== 'spell') return {}
  if (data.statBlock?.kind === 'spell') return entrySpellTraits(data.statBlock.entry)
  const reference = data.reference
  return {
    ...(typeof reference?.school === 'string' && reference.school.trim() ? { school: reference.school.trim() } : {}),
    ...(typeof reference?.level === 'number' ? { level: reference.level } : {}),
    ...(typeof reference?.ritual === 'boolean' ? { ritual: reference.ritual } : {}),
    ...(typeof reference?.concentration === 'boolean' ? { concentration: reference.concentration } : {}),
  }
}

export function instanceSpellSchool(data: InstanceData): string | undefined {
  return instanceSpellTraits(data).school
}

type TraitsRequest = {
  controller: AbortController
  promise: Promise<SpellNodeTraits>
  readers: number
  settled: boolean
}
const requests = new Map<string, TraitsRequest>()

/** Старые сохранения не содержат признаки: один запрос обслуживает все размещения заклинания. */
export function acquireSpellTraits(entityId: string) {
  let request = requests.get(entityId)
  if (!request) {
    const controller = new AbortController()
    const next: TraitsRequest = {
      controller, readers: 0, settled: false,
      promise: fetchEncyclopedia<EncyclopediaEntry>(`${encodeURIComponent(entityId)}/`, controller.signal)
        .then(entry => entry.entity_type === 'spell' ? entrySpellTraits(entry) : {})
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

/** Совместимый узкий контракт для кода, которому нужна только школа. */
export function acquireSpellSchool(entityId: string) {
  const request = acquireSpellTraits(entityId)
  return { promise: request.promise.then(value => value.school), release: request.release }
}
