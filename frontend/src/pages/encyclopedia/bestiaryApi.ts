import type { CreatureEntity } from '../../entities/creature'
import type { CatalogCreature } from './bestiaryCatalog'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const PAGE_SIZE = 100
const DETAIL_CONCURRENCY = 8

type JsonRecord = Record<string, unknown>
type EntitySummary = {
  id: number
  entity_type: string
  name: string
  name_en?: string
  slug: string
  sources?: unknown
  summary?: JsonRecord
}
type EntityDetail = EntitySummary & {
  content_text?: string
  data?: JsonRecord
}
type ListResponse = { count: number; results: EntitySummary[] }

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => values(item))
  if (typeof value === 'string') return value.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)
  return []
}

function sources(value: unknown): string[] {
  if (!Array.isArray(value)) return values(value)
  return value.map((item) => {
    const source = record(item)
    return text(source.name || source.title || source.label || source.source || item)
  }).filter(Boolean)
}

function speedText(value: unknown): string {
  if (typeof value === 'string') return value
  return Object.entries(record(value)).map(([kind, distance]) => `${kind} ${text(distance)}`).join(', ')
}

function movementKinds(value: unknown): string[] {
  const speed = speedText(value).toLocaleLowerCase('ru-RU')
  const kinds = [
    ['Полёт', /пол[её]т|летает|fly|flying/],
    ['Плавание', /плав|swim/],
    ['Лазание', /лазан|лазает|climb/],
    ['Рытьё', /рыть|копает|burrow/],
    ['Ползание', /полз|crawl/],
  ] as const
  const result: string[] = kinds.filter(([, pattern]) => pattern.test(speed)).map(([kind]) => kind)
  if (/(?:^|[,;])\s*(?:\d+\s*(?:фт|ft)|ходьба|пешком|walk|walking|speed)/i.test(speed) || Object.keys(record(value)).some((key) => /walk|ходьба/i.test(key))) {
    result.unshift('Ходьба')
  }
  return result
}

function namedNpc(data: JsonRecord): boolean | null {
  for (const key of ['named_npc', 'is_named_npc', 'namedNpc']) {
    if (typeof data[key] === 'boolean') return data[key] as boolean
  }
  return null
}

function armorClass(value: unknown): CreatureEntity['armorClass'] {
  const first = Array.isArray(value) ? value[0] : value
  const armor = record(first)
  const raw = text(armor.value ?? armor.ac ?? first)
  const match = raw.match(/^\d+/)
  return raw ? { value: match ? Number(match[0]) : raw } : undefined
}

function hitPoints(value: unknown): string | undefined {
  const hp = record(value)
  return text(hp.average ?? hp.value ?? hp.total ?? value) || undefined
}

function toCatalogCreature(summary: EntitySummary, detail?: EntityDetail): CatalogCreature {
  const data = record(detail?.data)
  const listed = record(summary.summary)
  const sourceNames = sources(detail?.sources ?? summary.sources)
  const size = text(data.size ?? listed.size)
  const creatureType = text(data.creature_type ?? listed.creature_type)
  const alignment = text(data.alignment ?? listed.alignment)
  const challengeRating = text(data.challenge_rating ?? listed.challenge_rating)
  const languages = values(data.languages)
  const habitats = values(data.habitat ?? data.environments)
  const speed = speedText(data.speed ?? data.movement)
  const entity: CreatureEntity = {
    id: String(summary.id), entityType: 'creature', slug: summary.slug,
    name: summary.name, nameEn: summary.name_en,
    challengeRating, size, creatureType, alignment,
    armorClass: armorClass(data.armor_class ?? data.ac),
    hitPoints: hitPoints(data.hit_points ?? data.hp),
    speed: speed || undefined,
    languages, habitat: habitats, sections: [],
  }

  return {
    id: summary.id, slug: summary.slug, name: summary.name, nameEn: summary.name_en || '',
    challengeRating, size, creatureType, alignment,
    sources: sourceNames,
    homebrew: data.is_homebrew === true || sourceNames.some((source) => /homebrew|хоумбрю|домашн/i.test(source)),
    namedNpc: namedNpc(data), languages, habitats,
    movements: movementKinds(data.speed ?? data.movement),
    contentText: detail?.content_text || '',
    entity,
  }
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' }, signal,
  })
  if (!response.ok) throw new Error(`API энциклопедии ответил ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadBestiary(
  signal: AbortSignal,
  onList: (creatures: CatalogCreature[]) => void,
  onProgress: (completed: number, total: number) => void,
): Promise<CatalogCreature[]> {
  const first = await getJson<ListResponse>(`/api/encyclopedia/?type=creature&page_size=${PAGE_SIZE}`, signal)
  const pageCount = Math.ceil(first.count / PAGE_SIZE)
  const pages = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
    getJson<ListResponse>(`/api/encyclopedia/?type=creature&page_size=${PAGE_SIZE}&page=${index + 2}`, signal),
  ))
  const summaries = [first, ...pages].flatMap((page) => page.results)
    .filter((item) => item.entity_type === 'creature' && item.slug !== 'tarrasque' && item.name.toLocaleLowerCase('ru-RU') !== 'тараск')
  const catalog = summaries.map((item) => toCatalogCreature(item))
  onList(catalog)
  onProgress(0, catalog.length)

  let cursor = 0
  let completed = 0
  let failed = false
  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, summaries.length) }, async () => {
    while (!failed && !signal.aborted && cursor < summaries.length) {
      const index = cursor++
      let detail: EntityDetail
      try {
        detail = await getJson<EntityDetail>(`/api/encyclopedia/${summaries[index].id}/`, signal)
      } catch (error) {
        failed = true
        throw error
      }
      if (detail.entity_type === 'creature') catalog[index] = toCatalogCreature(summaries[index], detail)
      completed++
      if (completed % 25 === 0 || completed === catalog.length) onProgress(completed, catalog.length)
    }
  }))
  return catalog
}

export async function getBestiaryCreature(creature: CatalogCreature, signal: AbortSignal): Promise<CatalogCreature> {
  const detail = await getJson<EntityDetail>(`/api/encyclopedia/${creature.id}/`, signal)
  return toCatalogCreature({
    id: creature.id,
    entity_type: 'creature',
    name: creature.name,
    name_en: creature.nameEn,
    slug: creature.slug,
    sources: creature.sources,
    summary: {
      challenge_rating: creature.challengeRating,
      size: creature.size,
      creature_type: creature.creatureType,
      alignment: creature.alignment,
    },
  }, detail)
}
