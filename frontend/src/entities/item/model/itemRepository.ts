import { authFetch } from '../../../shared/api/auth'
import type {
  ItemEntity,
  ItemFact,
  ItemSection,
  ItemTable,
  ItemTooltip,
} from './item'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')

type JsonRecord = Record<string, unknown>

export type EncyclopediaItemDetail = {
  id: number
  entity_type: string
  name: string
  name_en?: string
  slug: string
  sources?: unknown
  content_html?: string
  content_text?: string
  data?: unknown
}

type EncyclopediaItemSummary = Pick<
  EncyclopediaItemDetail,
  'entity_type' | 'id' | 'name' | 'name_en' | 'slug'
>

type EncyclopediaListResponse = {
  count: number
  results: EncyclopediaItemSummary[]
}

const factLabels: Record<string, string> = {
  price: 'Рекомендованная стоимость',
  cost: 'Рекомендованная стоимость',
  size: 'Размер',
  weight: 'Вес',
  charges: 'Заряды',
  damage: 'Урон',
  damage_type: 'Тип урона',
  armor_class: 'Класс доспеха',
  strength_requirement: 'Требование Силы',
  stealth_disadvantage: 'Помеха Скрытности',
  range: 'Дальность',
  capacity: 'Вместимость',
  duration: 'Длительность',
  creator: 'Создатель',
  age: 'Возраст',
}

const preferredFactOrder = [
  'price',
  'cost',
  'size',
  'weight',
  'charges',
  'damage',
  'damage_type',
  'armor_class',
  'strength_requirement',
  'stealth_disadvantage',
  'range',
  'capacity',
  'duration',
  'creator',
  'age',
]

const reservedKeys = new Set([
  'classification',
  'item_type',
  'type',
  'category',
  'rarity',
  'requires_attunement',
  'attunement',
  'tags',
  'keywords',
  'labels',
  'properties',
  'tooltips',
  'tables',
  'sections',
  'description',
  'description_html',
  'content_html',
  'content_text',
  'is_homebrew',
])

const sectionLabels: Record<string, string> = {
  description_html: 'Описание',
  properties_html: 'Свойства',
  features_html: 'Свойства',
  actions_html: 'Действия',
  notes_html: 'Примечания',
  rules_html: 'Правила',
}

export class ItemRepositoryError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ItemRepositoryError'
    this.status = status
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pick(record: JsonRecord, ...keys: readonly string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

function scalarText(value: unknown): string | undefined {
  const text = toText(value)
  if (text) return /<[^>]+>/.test(text) || text.length > 180 ? undefined : text
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (!Array.isArray(value)) return undefined

  const entries = value.map(toText).filter((entry): entry is string => Boolean(entry))
  const joined = entries.join(', ')
  return joined && joined.length <= 180 ? joined : undefined
}

function humanizeKey(key: string) {
  const normalized = key.replace(/_html$/, '').replace(/_/g, ' ')
  return normalized.charAt(0).toLocaleUpperCase('ru-RU') + normalized.slice(1)
}

function unique(values: readonly (string | undefined)[]) {
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const normalized = value?.trim()
    if (!normalized) return []
    const key = normalized.toLocaleLowerCase('ru-RU')
    if (seen.has(key)) return []
    seen.add(key)
    return [normalized]
  })
}

function sourceLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return unique(value.map((entry) => {
    if (!isRecord(entry)) return toText(entry)
    return toText(pick(entry, 'name', 'title', 'label', 'source', 'book'))
  }))
}

function valueList(value: unknown): string[] {
  if (Array.isArray(value)) return unique(value.map((entry) => {
    if (!isRecord(entry)) return toText(entry)
    return toText(pick(entry, 'name', 'title', 'label', 'value'))
  }))
  if (typeof value !== 'string') return []
  return unique(value.split(/[,;|]/).map((entry) => entry.trim()))
}

function readAttunement(data: JsonRecord): string | undefined {
  const value = pick(data, 'requires_attunement', 'attunement')
  if (value === true) return 'Требуется настройка'
  if (value === false) return 'Без настройки'
  const text = toText(value)
  if (!text) return undefined
  return /^(да|yes|true)$/i.test(text) ? 'Требуется настройка' : text
}

function readFacts(data: JsonRecord): ItemFact[] {
  const keys = Object.keys(data)
    .filter((key) => !reservedKeys.has(key) && !key.endsWith('_html'))
    .filter((key) => scalarText(data[key]))
    .sort((left, right) => {
      const leftIndex = preferredFactOrder.indexOf(left)
      const rightIndex = preferredFactOrder.indexOf(right)
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, 'ru')
      if (leftIndex === -1) return 1
      if (rightIndex === -1) return -1
      return leftIndex - rightIndex
    })

  const usedLabels = new Set<string>()
  return keys.flatMap((key) => {
    if (key === 'cost' && data.price != null) return []
    const value = scalarText(data[key])
    if (!value) return []
    const label = factLabels[key] ?? humanizeKey(key)
    if (usedLabels.has(label)) return []
    usedLabels.add(label)
    return [{ key, label, value }]
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function readSections(data: JsonRecord, detail: EncyclopediaItemDetail): ItemSection[] {
  const sections: ItemSection[] = []
  const seen = new Set<string>()
  const add = (id: string, html: string | undefined, title?: string) => {
    if (!html) return
    const comparable = html.replace(/\s+/g, ' ').trim()
    if (!comparable || [...seen].some((known) => known === comparable || known.includes(comparable))) return
    seen.add(comparable)
    sections.push({ id, title, html })
  }

  add(`${detail.slug}-content`, toText(detail.content_html))

  if (Array.isArray(data.sections)) {
    data.sections.forEach((entry, index) => {
      if (!isRecord(entry)) return
      add(
        toText(entry.id) ?? `${detail.slug}-section-${index + 1}`,
        toText(pick(entry, 'html', 'content_html', 'content', 'description')),
        toText(pick(entry, 'title', 'name', 'label')),
      )
    })
  }

  Object.entries(data).forEach(([key, value]) => {
    if (!key.endsWith('_html')) return
    add(`${detail.slug}-${key}`, toText(value), sectionLabels[key] ?? humanizeKey(key))
  })

  if (sections.length === 0) {
    const text = toText(detail.content_text) ?? toText(data.description)
    if (text) {
      add(
        `${detail.slug}-description`,
        text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(''),
      )
    }
  }

  return sections
}

function readTooltips(value: unknown): ItemTooltip[] {
  const entries: ItemTooltip[] = []
  const add = (term: unknown, explanation: unknown) => {
    const normalizedTerm = toText(term)
    const text = isRecord(explanation)
      ? toText(pick(explanation, 'text', 'description', 'content', 'value', 'html'))
      : toText(explanation)
    if (normalizedTerm && text) entries.push({ term: normalizedTerm, text: text.replace(/<[^>]*>/g, '') })
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (!isRecord(entry)) return
      add(
        pick(entry, 'term', 'name', 'title', 'label', 'keyword'),
        pick(entry, 'text', 'description', 'content', 'value', 'html'),
      )
    })
  } else if (isRecord(value)) {
    Object.entries(value).forEach(([term, explanation]) => add(term, explanation))
  }

  return entries
}

function readTables(value: unknown, slug: string): ItemTable[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry, index): ItemTable[] => {
    if (!isRecord(entry)) return []
    const rawRows = pick(entry, 'rows', 'data', 'values')
    if (!Array.isArray(rawRows)) return []

    const rows = rawRows.flatMap((row): string[][] => {
      if (Array.isArray(row)) return [row.map((cell) => scalarText(cell) ?? '')]
      if (isRecord(row)) return [Object.values(row).map((cell) => scalarText(cell) ?? '')]
      return []
    })
    if (rows.length === 0) return []

    const rawColumns = pick(entry, 'columns', 'headers', 'headings')
    const columns = Array.isArray(rawColumns)
      ? rawColumns.map((column) => scalarText(column) ?? '')
      : isRecord(rawRows[0]) ? Object.keys(rawRows[0]) : []

    return [{
      id: toText(entry.id) ?? `${slug}-table-${index + 1}`,
      title: toText(pick(entry, 'title', 'name', 'label')),
      columns,
      rows,
    }]
  })
}

export function toItemEntity(detail: EncyclopediaItemDetail): ItemEntity {
  const data = isRecord(detail.data) ? detail.data : {}
  const classification = toText(pick(data, 'classification', 'item_type', 'type', 'category'))
  const rarity = toText(data.rarity)
  const tags = unique([
    ...valueList(data.tags),
    ...valueList(data.keywords),
    ...valueList(data.labels),
    ...valueList(data.properties),
    data.is_homebrew === true ? 'Авторский материал' : undefined,
  ])

  return {
    id: String(detail.id),
    entityType: 'item',
    slug: detail.slug,
    name: detail.name,
    nameEn: detail.name_en?.trim() || undefined,
    classification,
    rarity,
    attunement: readAttunement(data),
    facts: readFacts(data),
    tags,
    sources: sourceLabels(detail.sources),
    sections: readSections(data, detail),
    tooltips: readTooltips(data.tooltips),
    tables: readTables(data.tables, detail.slug),
  }
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await authFetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new ItemRepositoryError(`API энциклопедии ответил ${response.status}`, response.status)
  }
  return response.json() as Promise<T>
}

export async function getItemBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<ItemEntity | null> {
  const search = new URLSearchParams({ type: 'item', slug, page_size: '1' })
  const list = await requestJson<EncyclopediaListResponse>(
    `${API_BASE_URL}/api/encyclopedia/?${search}`,
    signal,
  )
  const summary = list.results.find((entry) => entry.entity_type === 'item' && entry.slug === slug)
  if (!summary) return null

  const detail = await requestJson<EncyclopediaItemDetail>(
    `${API_BASE_URL}/api/encyclopedia/${summary.id}/`,
    signal,
  )
  return detail.entity_type === 'item' ? toItemEntity(detail) : null
}
