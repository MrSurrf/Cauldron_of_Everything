import { describe, expect, it } from 'vitest'

import { toItemEntity } from './itemRepository'

describe('toItemEntity', () => {
  it('сохраняет метаданные, теги и пояснения предмета из ответа БД', () => {
    const item = toItemEntity({
      id: 42,
      entity_type: 'item',
      name: 'Абракадабрус',
      name_en: 'Abracadabrus',
      slug: 'abracadabrus',
      sources: [{ name: 'Книга обо всём' }],
      content_html: '<p>Богато украшенный сундук.</p><h3>Свойства</h3><p>Сундук имеет 20 зарядов.</p>',
      content_text: 'Богато украшенный сундук.',
      data: {
        classification: 'Чудесный предмет',
        rarity: 'Очень редкий',
        requires_attunement: true,
        price: '5 001–50 000 зм',
        size: 'Куб 1½ фута',
        weight: '25 фунтов',
        tags: ['Хранилище', 'Призыв'],
        properties_html: '<h3>Свойства</h3><p>Сундук имеет 20 зарядов.</p>',
        tooltips: { Заряды: 'Расходуемый ресурс предмета.' },
        tables: [{ title: 'Результат', headers: ['к20', 'Эффект'], rows: [['1', 'Магия исчезает']] }],
      },
    })

    expect(item).toMatchObject({
      id: '42',
      entityType: 'item',
      classification: 'Чудесный предмет',
      rarity: 'Очень редкий',
      attunement: 'Требуется настройка',
      tags: ['Хранилище', 'Призыв'],
      sources: ['Книга обо всём'],
    })
    expect(item.facts.map(({ label, value }) => [label, value])).toEqual([
      ['Рекомендованная стоимость', '5 001–50 000 зм'],
      ['Размер', 'Куб 1½ фута'],
      ['Вес', '25 фунтов'],
    ])
    expect(item.sections).toHaveLength(1)
    expect(item.tooltips).toEqual([{ term: 'Заряды', text: 'Расходуемый ресурс предмета.' }])
    expect(item.tables[0]).toMatchObject({ columns: ['к20', 'Эффект'], rows: [['1', 'Магия исчезает']] })
  })

  it('показывает неизвестные скалярные поля и использует текст как запасное описание', () => {
    const item = toItemEntity({
      id: 7,
      entity_type: 'item',
      name: 'Камень',
      slug: 'stone',
      content_text: 'Первый абзац.\n\nВторой абзац.',
      data: { custom_effect: 'Светится в темноте', requires_attunement: false },
    })

    expect(item.attunement).toBe('Без настройки')
    expect(item.facts).toContainEqual({ key: 'custom_effect', label: 'Custom effect', value: 'Светится в темноте' })
    expect(item.sections[0].html).toContain('<p>Первый абзац.</p>')
  })
})
