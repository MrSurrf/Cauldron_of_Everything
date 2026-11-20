import { describe, expect, it } from 'vitest'
import { groupBackgroundsBySource, toCatalogBackground } from './backgroundCatalog'

const entry = (id: number, name: string, sources: unknown) => toCatalogBackground({ id, name, name_en: '', entity_type: 'background', slug: String(id), sources })

describe('Группировка предысторий по источникам', () => {
  it('ставит книгу игрока первой, неизвестный источник последним и сортирует внутри групп', () => {
    const groups = groupBackgroundsBySource([
      entry(1, 'Моряк', ["Player’s Handbook"]),
      entry(2, 'Артист', ["Player’s Handbook"]),
      entry(3, 'Атлет', ['Mythic Odysseys of Theros']),
      entry(4, 'Без источника', []),
      entry(5, 'Награждённый', ['The Book of Many Things']),
    ])
    expect(groups.map(group => group.source)).toEqual(["Player’s Handbook", 'The Book of Many Things', 'Mythic Odysseys of Theros', 'Источник не указан'])
    expect(groups[0].entries.map(item => item.name)).toEqual(['Артист', 'Моряк'])
  })

  it('показывает запись под каждым источником без повторов в одной группе', () => {
    const groups = groupBackgroundsBySource([entry(1, 'Моряк', ['PHB', 'PHB', 'Другой сборник'])])
    expect(groups).toHaveLength(2)
    expect(groups.every(group => group.entries.length === 1)).toBe(true)
  })

  it('читает объекты источников, навыки и признак домашних материалов', () => {
    const result = toCatalogBackground({ id: 1, name: 'Авторская предыстория', name_en: '', entity_type: 'background', slug: 'custom', sources: [{ name: 'Homebrew' }], summary: { skill_proficiencies: 'История, Магия' } })
    expect(result.sources).toEqual(['Homebrew'])
    expect(result.skills).toEqual(['История', 'Магия'])
    expect(result.homebrew).toBe(true)
  })
})
