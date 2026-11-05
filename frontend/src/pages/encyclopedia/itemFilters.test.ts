import { describe, expect, it } from 'vitest'

import type { CatalogItem } from './itemCatalog'
import { toCatalogItem } from './itemCatalog'
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

  it('объединяет подтипы в девять категорий и фильтрует все варианты выбранного вида', () => {
    const classifications = [
      'Волшебная палочка, редкая',
      'Доспех (щит)',
      'Доспех (латы)',
      'Свиток (заклинание)',
      'Зелье, обычное',
      'Кольцо, редкое',
      'Чудесный предмет',
      'Волшебная безделушка',
      'Wondrous item, rare',
      'Посох, редкий',
      'Жезл, необычный',
      'Оружие (длинный меч)',
      'Оружие (кинжал)',
    ]
    const catalog = classifications.map((classification, index) => toCatalogItem({
      id: index + 1,
      entity_type: 'item',
      name: `Предмет ${index + 1}`,
      slug: `item-${index + 1}`,
      summary: { classification },
    }))
    const filters = emptyItemFilters()
    expect(itemFacetOptions(catalog, filters, 'itemType')).toHaveLength(9)
    expect(itemFacetOptions(catalog, filters, 'itemType')).toEqual(expect.arrayContaining([
      { value: 'Доспех', count: 2 },
      { value: 'Маг. безделушка', count: 3 },
      { value: 'Оружие', count: 2 },
    ]))

    filters.selected.itemType = ['Оружие']
    expect(filterItems(catalog, filters).map((item) => item.id)).toEqual([12, 13])

    filters.selected.itemType = ['Маг. безделушка']
    expect(filterItems(catalog, filters).map((item) => item.id)).toEqual([7, 8, 9])
  })
})
