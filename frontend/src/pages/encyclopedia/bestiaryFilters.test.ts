import { describe, expect, it } from 'vitest'

import type { CatalogCreature } from './bestiaryCatalog'
import { tarrasqueCatalogEntry } from './mockBestiary'
import { emptyFilters, facetOptions, filterCatalog } from './bestiaryFilters'

const base: CatalogCreature = {
  id: 1, slug: 'first', name: 'Аббат', nameEn: '', challengeRating: '1/2',
  size: 'Средний', creatureType: 'Гуманоид', alignment: 'добрый',
  sources: ['Книга А'], homebrew: false, namedNpc: true,
  languages: ['Общий'], habitats: ['Город'], movements: ['Ходьба'],
  contentText: 'Проводит обряд у алтаря.',
  entity: { id: '1', slug: 'first', name: 'Аббат', entityType: 'creature', sections: [] },
}

const catalog: CatalogCreature[] = [
  base,
  { ...base, id: 2, slug: 'second', name: 'Болотник', challengeRating: '2', size: 'Большой',
    namedNpc: false, languages: ['Сильван'], habitats: ['Болото'], movements: ['Плавание'],
    contentText: 'Скрывается под водой.' },
  { ...base, id: 3, slug: 'third', name: 'Ведьма', challengeRating: '1/4',
    languages: ['Общий', 'Сильван'], habitats: ['Болото'], movements: ['Полёт'],
    contentText: 'Использует древнее заклинание.' },
]

describe('фасетный поиск бестиария', () => {
  it('оставляет локальным только полный статблок Тараска', () => {
    expect(tarrasqueCatalogEntry.fullRecord).toBe(true)
    expect(tarrasqueCatalogEntry.name).toBe('Тараск')
    expect(tarrasqueCatalogEntry.id).toBeLessThan(0)
  })

  it('ищет по полному тексту карточки и названию без учёта регистра', () => {
    const filters = { ...emptyFilters(), query: 'ДРЕВНЕЕ заклинание' }
    expect(filterCatalog(catalog, filters).map(({ name }) => name)).toEqual(['Ведьма'])
  })

  it('пересчитывает варианты по другим фасетам и сохраняет выбор своего', () => {
    const filters = emptyFilters()
    filters.selected.habitats = ['Болото']
    filters.selected.languages = ['Общий']
    expect(filterCatalog(catalog, filters).map(({ name }) => name)).toEqual(['Ведьма'])
    expect(facetOptions(catalog, filters, 'languages')).toEqual([
      { value: 'Общий', count: 1 }, { value: 'Сильван', count: 2 },
    ])
    expect(facetOptions(catalog, filters, 'habitats')).toEqual([
      { value: 'Болото', count: 1 }, { value: 'Город', count: 1 },
    ])
  })

  it('сортирует по русскому алфавиту, затем по дробному показателю опасности', () => {
    expect(filterCatalog(catalog, emptyFilters()).map(({ name }) => name))
      .toEqual(['Аббат', 'Болотник', 'Ведьма'])
    expect(filterCatalog(catalog, { ...emptyFilters(), sort: 'challenge-asc' })
      .map(({ name }) => name)).toEqual(['Ведьма', 'Аббат', 'Болотник'])
  })
})
