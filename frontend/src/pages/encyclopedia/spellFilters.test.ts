import { describe, expect, it } from 'vitest'
import { toCatalogSpell, type CatalogSpell } from './spellCatalog'
import { emptySpellFilters, filterSpells, spellFacetOptions } from './spellFilters'

const first = toCatalogSpell({
  id: 1, entity_type: 'spell', name: 'Аура', slug: 'aura', sources: [{ name: 'PHB' }],
  summary: { level: 2, school: 'Ограждение', classes: ['Жрец'], subclasses: ['Домен жизни'],
    components: 'В, С, М', casting_time: '1 действие', damage_type: 'Огонь',
    concentration: true, ritual: false },
})
const spells: CatalogSpell[] = [
  first,
  { ...first, id: 2, name: 'Буря', level: '3', school: 'Воплощение', classes: ['Друид'],
    subclasses: [], sources: ['TCE'], components: ['Вербальный'], concentration: 'Нет',
    ritual: 'Да', homebrew: false },
  { ...first, id: 3, name: 'Вспышка', level: '1', homebrew: true, sources: ['Homebrew'] },
]

describe('каталог и фасеты заклинаний', () => {
  it('читает поля краткого ответа API', () => {
    expect(first).toMatchObject({ level: '2', school: 'Ограждение',
      classes: ['Жрец'], subclasses: ['Домен жизни'], components: ['Вербальный', 'Соматический', 'Материальный'],
      concentration: 'Да', ritual: 'Нет', castingTime: '1 действие', damageTypes: ['Огонь'] })
  })

  it('учитывает происхождение, TCE и сочетание фасетов', () => {
    const filters = emptySpellFilters()
    filters.excludeTce = true
    expect(filterSpells(spells, filters).map((spell) => spell.name)).toEqual(['Аура'])
    filters.excludeTce = false
    filters.selected.level = ['3']
    filters.selected.classes = ['Друид']
    expect(filterSpells(spells, filters).map((spell) => spell.name)).toEqual(['Буря'])
    expect(spellFacetOptions(spells, filters, 'classes')).toEqual([{ value: 'Друид', count: 1 }])
  })

  it('сортирует по уровню и школе', () => {
    expect(filterSpells(spells, { ...emptySpellFilters(), sort: 'level' }).map((spell) => spell.name))
      .toEqual(['Аура', 'Буря'])
    expect(filterSpells(spells, { ...emptySpellFilters(), sort: 'school' }).map((spell) => spell.name))
      .toEqual(['Буря', 'Аура'])
  })
})
