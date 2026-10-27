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
})
