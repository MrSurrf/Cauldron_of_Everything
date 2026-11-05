import { describe, expect, it } from 'vitest'

import { toCatalogItem } from './itemCatalog'

describe('toCatalogItem', () => {
  it('преобразует поля списка предметов из API', () => {
    expect(toCatalogItem({
      id: 12,
      entity_type: 'item',
      name: 'Клинок рассвета',
      name_en: 'Dawn Blade',
      slug: 'dawn-blade',
      sources: [{ name: 'Книга мастера' }],
      summary: {
        classification: 'Оружие',
        rarity: 'Редкий',
        requires_attunement: true,
      },
    })).toEqual({
      id: 12,
      slug: 'dawn-blade',
      name: 'Клинок рассвета',
      nameEn: 'Dawn Blade',
      itemType: 'Оружие',
      rarity: 'Редкий',
      attunement: 'Требуется',
      sources: ['Книга мастера'],
      homebrew: false,
    })
  })

  it('распознаёт homebrew по источнику и сохраняет неизвестные значения', () => {
    const item = toCatalogItem({
      id: 13,
      entity_type: 'item',
      name: 'Авторский предмет',
      slug: 'custom-item',
      sources: ['Homebrew'],
      summary: {},
    })
    expect(item.homebrew).toBe(true)
    expect(item.itemType).toBe('Тип не указан')
    expect(item.rarity).toBe('Редкость не указана')
    expect(item.attunement).toBe('Не указано')
  })

  it.each([
    ['Волшебная палочка, редкая', 'Волшебная палочка'],
    ['Доспех (щит), необычный', 'Доспех'],
    ['Свиток (заклинание), редкий', 'Свиток'],
    ['Зелье, обычное', 'Зелье'],
    ['Кольцо, очень редкое', 'Кольцо'],
    ['Чудесный предмет, легендарный', 'Маг. безделушка'],
    ['Волшебная безделушка', 'Маг. безделушка'],
    ['Посох, редкий (требуется настройка)', 'Посох'],
    ['Жезл, необычный', 'Жезл'],
    ['Оружие (длинный меч), редкое', 'Оружие'],
    ['Wondrous item (tattoo), rare', 'Маг. безделушка'],
    ['Реликвия (кольцо)', 'Реликвия (кольцо)'],
  ])('нормализует классификацию %s для фильтров', (classification, itemType) => {
    const item = toCatalogItem({
      id: 14,
      entity_type: 'item',
      name: 'Предмет',
      slug: 'item',
      summary: { classification },
    })
    expect(item.itemType).toBe(itemType)
  })

  it.each(['item_type', 'type', 'category'])('читает классификацию из поля %s', (key) => {
    const item = toCatalogItem({
      id: 15,
      entity_type: 'item',
      name: 'Клинок',
      slug: 'blade',
      summary: { [key]: 'Оружие (кинжал)' },
    })
    expect(item.itemType).toBe('Оружие')
  })
})
