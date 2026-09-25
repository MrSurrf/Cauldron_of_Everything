import { mockTarrasque } from '../../entities/creature'
import type { CatalogCreature } from './bestiaryCatalog'

// Полный статблок Тараска пока остаётся локальным.
export const tarrasqueCatalogEntry: CatalogCreature = {
  id: -1,
  slug: mockTarrasque.slug,
  name: mockTarrasque.name,
  nameEn: mockTarrasque.nameEn,
  challengeRating: mockTarrasque.challengeRating,
  size: mockTarrasque.size,
  creatureType: mockTarrasque.creatureType,
  alignment: mockTarrasque.alignment,
  sources: ['Бестиарий'],
  homebrew: false,
  namedNpc: false,
  languages: [...(mockTarrasque.languages ?? [])],
  habitats: ['Равнины'],
  movements: ['Ходьба', 'Полёт', 'Лазание', 'Плавание'],
  contentText: 'Тараск — исполинское бедствие. Его панцирь отражает магию, а каждый шаг ощущается как землетрясение.',
  fullRecord: true,
  entity: mockTarrasque,
}
