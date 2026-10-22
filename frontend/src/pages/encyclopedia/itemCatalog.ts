import { fetchEncyclopedia } from './encyclopediaApi'

type JsonRecord = Record<string, unknown>

export type ItemSummary = {
  id: number
  entity_type: string
  name: string
  name_en?: string
  slug: string
  sources?: unknown
  summary?: JsonRecord
}

export type CatalogItem = {
  id: number
  slug: string
  name: string
  nameEn: string
  itemType: string
  rarity: string
  attunement: string
  sources: string[]
  homebrew: boolean
}

type ItemPage = {
  count: number
  results: ItemSummary[]
}

const PAGE_SIZE = 100

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const item = record(value)
  return text(item.name ?? item.title ?? item.label ?? item.source ?? item.book ?? item.value)
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(values)
  const item = text(value)
  return item ? [item] : []
}

function attunementLabel(value: unknown): string {
  if (value === true || /^(true|yes|да|1)$/i.test(text(value))) return 'Требуется'
  if (value === false || /^(false|no|нет|0)$/i.test(text(value))) return 'Не требуется'
  const label = text(value)
  return label || 'Не указано'
}

export function toCatalogItem(item: ItemSummary): CatalogItem {
  const data = record(item.summary)
  const sources = values(item.sources)
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.name_en ?? '',
    itemType: text(data.classification ?? data.item_type ?? data.type) || 'Тип не указан',
    rarity: text(data.rarity) || 'Редкость не указана',
    attunement: attunementLabel(data.requires_attunement ?? data.attunement),
    sources,
    homebrew: data.is_homebrew === true
      || sources.some((source) => /homebrew|хоумбрю|домашн/i.test(source)),
  }
}

export async function loadItems(signal: AbortSignal, query = ''): Promise<CatalogItem[]> {
  const params = new URLSearchParams({ type: 'item', page_size: String(PAGE_SIZE) })
  if (query.trim()) params.set('q', query.trim())
  const first = await fetchEncyclopedia<ItemPage>(`?${params}`, signal)
  const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.count / PAGE_SIZE) - 1) }, (_, index) =>
    fetchEncyclopedia<ItemPage>(`?${params}&page=${index + 2}`, signal),
  ))
  return [first, ...pages].flatMap((page) => page.results)
    .filter((item) => item.entity_type === 'item')
    .map(toCatalogItem)
}
