import type { CatalogSpell } from './spellCatalog'

export const SPELL_FACETS = [
  { key: 'level', label: 'Уровень' },
  { key: 'classes', label: 'Класс' },
  { key: 'subclasses', label: 'Подкласс' },
  { key: 'school', label: 'Школа' },
  { key: 'sources', label: 'Источник' },
  { key: 'concentration', label: 'Концентрация' },
  { key: 'ritual', label: 'Ритуал' },
  { key: 'components', label: 'Компоненты' },
  { key: 'castingTime', label: 'Время накладывания' },
  { key: 'damageTypes', label: 'Наносимый урон' },
] as const

export type SpellFacetKey = (typeof SPELL_FACETS)[number]['key']
export type SpellSort = 'name' | 'level' | 'school'
export type SpellFilters = {
  query: string
  letter: string
  sourceMode: 'official' | 'homebrew'
  excludeTce: boolean
  sort: SpellSort
  selected: Record<SpellFacetKey, string[]>
}

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function emptySpellFilters(): SpellFilters {
  return {
    query: '', letter: '', sourceMode: 'official', excludeTce: false, sort: 'name',
    selected: {
      level: [], classes: [], subclasses: [], school: [], sources: [],
      concentration: [], ritual: [], components: [], castingTime: [], damageTypes: [],
    },
  }
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function values(spell: CatalogSpell, key: SpellFacetKey): string[] {
  const value = spell[key]
  return Array.isArray(value) ? value : value ? [value] : []
}

function matches(spell: CatalogSpell, filters: SpellFilters, ignoredFacet?: SpellFacetKey): boolean {
  if (spell.homebrew !== (filters.sourceMode === 'homebrew')) return false
  if (filters.excludeTce && spell.sources.some((source) => /\bTCE\b|таш[иy]|tasha/i.test(source))) return false
  if (filters.letter && !normalize(spell.name).startsWith(normalize(filters.letter))) return false
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  if (words.length && !words.every((word) => normalize(`${spell.name} ${spell.nameEn}`).includes(word))) return false
  return SPELL_FACETS.every(({ key }) =>
    key === ignoredFacet || filters.selected[key].length === 0
      || filters.selected[key].some((selected) => values(spell, key).includes(selected)),
  )
}

export function filterSpells(spells: readonly CatalogSpell[], filters: SpellFilters): CatalogSpell[] {
  return spells.filter((spell) => matches(spell, filters)).sort((a, b) => {
    if (filters.sort === 'level') {
      const difference = Number.parseInt(a.level, 10) - Number.parseInt(b.level, 10)
      if (!Number.isNaN(difference) && difference !== 0) return difference
    }
    if (filters.sort === 'school') {
      const difference = collator.compare(a.school, b.school)
      if (difference) return difference
    }
    return collator.compare(a.name, b.name) || a.id - b.id
  })
}

export function spellFacetOptions(spells: readonly CatalogSpell[], filters: SpellFilters, key: SpellFacetKey) {
  const counts = new Map<string, number>()
  for (const spell of spells) {
    if (!matches(spell, filters, key)) continue
    for (const value of new Set(values(spell, key))) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  for (const value of filters.selected[key]) if (!counts.has(value)) counts.set(value, 0)
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) =>
    key === 'level'
      ? Number.parseInt(a.value, 10) - Number.parseInt(b.value, 10)
      : collator.compare(a.value, b.value),
  )
}
