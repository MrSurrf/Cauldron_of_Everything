import type { CatalogCreature } from './bestiaryCatalog'

export const FACETS = [
  { key: 'size', label: 'Размер' },
  { key: 'creatureType', label: 'Вид' },
  { key: 'alignment', label: 'Мировоззрение' },
  { key: 'challengeRating', label: 'Опасность' },
  { key: 'sources', label: 'Источник' },
  { key: 'namedNpc', label: 'Именной НИП' },
  { key: 'languages', label: 'Языки' },
  { key: 'habitats', label: 'Местность' },
  { key: 'movements', label: 'Скорость' },
] as const

export type FacetKey = (typeof FACETS)[number]['key']
export type SortKey = 'alphabetical' | 'challenge-asc' | 'challenge-desc'
export type SourceMode = 'official' | 'homebrew'
export type FilterState = {
  query: string
  letter: string
  sourceMode: SourceMode
  sort: SortKey
  selected: Record<FacetKey, string[]>
}

export type FacetOption = { value: string; count: number }

export function emptyFilters(): FilterState {
  return {
    query: '',
    letter: '',
    sourceMode: 'official',
    sort: 'alphabetical',
    selected: {
      challengeRating: [], size: [], creatureType: [], alignment: [],
      sources: [], namedNpc: [], languages: [], habitats: [], movements: [],
    },
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function facetValues(creature: CatalogCreature, key: FacetKey): string[] {
  if (key === 'namedNpc') {
    return [creature.namedNpc === null ? 'Не указано' : creature.namedNpc ? 'Да' : 'Нет']
  }
  const value = creature[key]
  if (Array.isArray(value)) return value
  return value ? [value as string] : []
}

function matches(creature: CatalogCreature, filters: FilterState, ignoredFacet?: FacetKey): boolean {
  if (creature.homebrew !== (filters.sourceMode === 'homebrew')) return false
  if (filters.letter && !normalize(creature.name).startsWith(normalize(filters.letter))) return false
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  if (words.length) {
    const haystack = normalize(`${creature.name} ${creature.nameEn} ${creature.contentText}`)
    if (!words.every((word) => haystack.includes(word))) return false
  }
  return FACETS.every(({ key }) => {
    if (key === ignoredFacet || filters.selected[key].length === 0) return true
    const values = facetValues(creature, key)
    return filters.selected[key].some((selected) => values.includes(selected))
  })
}

export function challengeNumber(value: string): number {
  const match = value.match(/^\s*(\d+)(?:\s*\/\s*(\d+))?/)
  if (!match) return -1
  return Number(match[1]) / Number(match[2] || 1)
}

const alphabetic = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function filterCatalog(creatures: readonly CatalogCreature[], filters: FilterState): CatalogCreature[] {
  return creatures.filter((creature) => matches(creature, filters)).sort((a, b) => {
    if (filters.sort !== 'alphabetical') {
      const aRating = challengeNumber(a.challengeRating)
      const bRating = challengeNumber(b.challengeRating)
      if (aRating < 0 && bRating >= 0) return 1
      if (bRating < 0 && aRating >= 0) return -1
      const difference = aRating - bRating
      if (difference) return filters.sort === 'challenge-asc' ? difference : -difference
    }
    return alphabetic.compare(a.name, b.name) || a.id - b.id
  })
}

export function facetOptions(
  creatures: readonly CatalogCreature[],
  filters: FilterState,
  key: FacetKey,
): FacetOption[] {
  const counts = new Map<string, number>()
  for (const creature of creatures) {
    if (!matches(creature, filters, key)) continue
    for (const value of new Set(facetValues(creature, key))) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  // Выбранный вариант остаётся видимым даже если остальные фасеты обнулили счётчик.
  for (const value of filters.selected[key]) {
    if (!counts.has(value)) counts.set(value, 0)
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) =>
    key === 'challengeRating'
      ? challengeNumber(a.value) - challengeNumber(b.value)
      : alphabetic.compare(a.value, b.value),
  )
}
