import { describe, expect, it } from 'vitest'

import type { CatalogItem } from './itemCatalog'
import { emptyItemFilters, filterItems, itemFacetOptions } from './itemFilters'

const items: CatalogItem[] = [
  { id: 1, slug: 'amulet', name: 'Амулет', nameEn: '', itemType: 'Чудесный предмет', rarity: 'Редкий', attunement: 'Требуется', sources: ['DMG'], homebrew: false },
  { id: 2, slug: 'blade', name: 'Клинок', nameEn: '', itemType: 'Оружие', rarity: 'Редкий', attunement: 'Не требуется', sources: ['DMG'], homebrew: false },
  { id: 3, slug: 'custom', name: 'Авторский клинок', nameEn: '', itemType: 'Оружие', rarity: 'Очень редкий', attunement: 'Требуется', sources: ['Homebrew'], homebrew: true },
]

describe('item filters', () => {
  it('фильтрует по режиму источника и нескольким фасетам', () => {
    const filters = emptyItemFilters()
    filters.selected.itemType = ['Оружие']
    filters.selected.attunement = ['Не требуется']
    expect(filterItems(items, filters).map((item) => item.name)).toEqual(['Клинок'])
  })

  it('считает варианты фасета с учётом остальных выбранных фильтров', () => {
    const filters = emptyItemFilters()
    filters.selected.rarity = ['Редкий']
    expect(itemFacetOptions(items, filters, 'itemType')).toEqual([
      { value: 'Оружие', count: 1 },
      { value: 'Чудесный предмет', count: 1 },
    ])
  })
})
