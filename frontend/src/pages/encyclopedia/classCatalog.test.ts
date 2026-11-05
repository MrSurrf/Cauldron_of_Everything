import { describe, expect, it } from 'vitest'

import { filterClasses, toCatalogClass } from './classCatalog'

const makeClass = (id: number, name: string, nameEn: string, sources: unknown = ['PHB']) => toCatalogClass({
  id,
  name,
  name_en: nameEn,
  entity_type: 'class',
  slug: String(id),
  sources,
  summary: { hit_die: 'к10' },
})

describe('Каталог классов', () => {
  it('добавляет профиль класса и нормализует источник и кость хитов', () => {
    const fighter = makeClass(1, 'Воин', 'Fighter', [{ name: 'Player’s Handbook' }])
    expect(fighter.sources).toEqual(['Player’s Handbook'])
    expect(fighter.hitDie).toBe('к10')
    expect(fighter.roles).toContain('Урон')
    expect(fighter.collection).toBe('base')
  })

  it('делает Изобретателя расширенным классом и фильтрует по роли', () => {
    const fighter = makeClass(1, 'Воин', 'Fighter')
    const artificer = makeClass(2, 'Изобретатель', 'Artificer', ['Tasha’s Cauldron of Everything'])
    expect(artificer.collection).toBe('expanded')
    expect(filterClasses([fighter, artificer], { collection: 'expanded', role: 'Поддержка', source: null }))
      .toEqual([artificer])
  })

  it('оставляет Чародея обычной карточкой базового класса', () => {
    const sorcerer = makeClass(3, 'Чародей', 'Sorcerer')
    expect(sorcerer.collection).toBe('base')
    expect(sorcerer.roles).toEqual(['Урон', 'Контроль'])
  })
})
