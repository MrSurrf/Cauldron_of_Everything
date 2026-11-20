import { catalogNameKey } from './catalogAlphabet'
import type { CatalogItem } from './itemCatalog'

export const ITEM_FACETS = [
  { key: 'itemType', label: 'Тип' },
  { key: 'rarity', label: 'Редкость' },
  { key: 'attunement', label: 'Настройка' },
  { key: 'sources', label: 'Источник' },
] as const

export type ItemFacetKey = (typeof ITEM_FACETS)[number]['key']
export type ItemFilters = {
  letter: string
  sourceMode: 'official' | 'homebrew'
  selected: Record<ItemFacetKey, string[]>
}

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function emptyItemFilters(): ItemFilters {
  return {
    letter: '',
    sourceMode: 'official',
    selected: { itemType: [], rarity: [], attunement: [], sources: [] },
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function values(item: CatalogItem, key: ItemFacetKey): string[] {
  const value = item[key]
  return Array.isArray(value) ? value : value ? [value] : []
}

function matches(item: CatalogItem, filters: ItemFilters, ignoredFacet?: ItemFacetKey) {
  if (item.homebrew !== (filters.sourceMode === 'homebrew')) return false
  if (filters.letter && !normalize(catalogNameKey(item.name)).startsWith(normalize(filters.letter))) return false
  return ITEM_FACETS.every(({ key }) =>
    key === ignoredFacet
    || filters.selected[key].length === 0
    || filters.selected[key].some((selected) => values(item, key).includes(selected)),
  )
}

export function filterItems(items: readonly CatalogItem[], filters: ItemFilters): CatalogItem[] {
  return items.filter((item) => matches(item, filters)).sort((left, right) =>
    collator.compare(catalogNameKey(left.name), catalogNameKey(right.name)) || left.id - right.id,
  )
}

export function itemFacetOptions(items: readonly CatalogItem[], filters: ItemFilters, key: ItemFacetKey) {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (!matches(item, filters, key)) continue
    for (const value of new Set(values(item, key))) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  for (const value of filters.selected[key]) if (!counts.has(value)) counts.set(value, 0)
  return [...counts].map(([value, count]) => ({ value, count })).sort((left, right) => collator.compare(left.value, right.value))
}
