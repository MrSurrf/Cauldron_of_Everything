import type { EntityReference, EntityType } from '../../../entities/base'
import { fetchEncyclopedia } from '../../../entities/encyclopedia'
import type { EncyclopediaEntry } from '../../../entities/encyclopedia'
import { campaignRequest, ownedReference } from './campaignApi'
import type { OwnedMaterial } from './campaignApi'

export const LIBRARY_SECTIONS = [
  ['creature', 'Бестиарий'], ['class', 'Классы'], ['race', 'Расы'],
  ['background', 'Предыстории'], ['feat', 'Черты'], ['spell', 'Заклинания'],
  ['item', 'Магические предметы'], ['reference', 'Справочные материалы'],
  ['character', 'Мои персонажи'], ['campaign', 'Кампании'],
] as const
export type LibrarySection = typeof LIBRARY_SECTIONS[number][0]
export const PLACEMENT_LIBRARY_SECTIONS = LIBRARY_SECTIONS.filter(([id]) => ['creature', 'spell', 'item', 'character', 'campaign'].includes(id))
export const placementLibrarySection = (section: unknown): LibrarySection =>
  PLACEMENT_LIBRARY_SECTIONS.some(([id]) => id === section) ? section as LibrarySection : 'creature'
export const canPlaceReference = (reference: LibraryReference) => reference.source !== 'encyclopedia'
  || ['creature', 'spell', 'item'].includes(reference.entityType)
export const entityLabel = (type: EntityType | 'location') => ({
  playerCharacter: 'Игровой персонаж', quest: 'Квест', faction: 'Фракция',
  location: 'Локация', note: 'Заметка', npc: 'NPC', creature: 'Существо', class: 'Класс', race: 'Раса', background: 'Предыстория',
  feat: 'Черта', spell: 'Заклинание', item: 'Предмет', sidekick: 'Спутник', reference: 'Справочный материал', character: 'Персонаж', campaign: 'Кампания',
})[type]

// Ссылка и краткая подпись для списка; оригинальные данные остаются в Entity.
export type LibraryReference = EntityReference & {
  source: 'encyclopedia' | 'character' | 'campaign'
  name: string
  slug: string
  facts: string[]
}

export function entryReference(entry: EncyclopediaEntry): LibraryReference {
  const data = entry.summary ?? entry.data ?? {}
  const facts = ['challenge_rating', 'level', 'school', 'rarity', 'creature_type', 'size', 'hit_die', 'prerequisite']
    .flatMap(key => typeof data[key] === 'string' || typeof data[key] === 'number'
      ? [`${key === 'challenge_rating' ? 'ПО ' : key === 'level' ? 'Уровень ' : ''}${data[key]}`] : [])
  if (entry.entity_type === 'item') {
    const cost = data.cost ?? data.price
    if (typeof cost === 'string' || typeof cost === 'number') facts.push(`Стоимость ${cost}`)
  }
  return { source: 'encyclopedia', entityId: String(entry.id), entityType: entry.entity_type as EntityType,
    slug: entry.slug, name: entry.name, facts }
}

export async function searchLibrary(section: LibrarySection, query: string, page: number, signal: AbortSignal) {
  if (section === 'character' || section === 'campaign') {
    const params = new URLSearchParams({ q: query.trim(), page: String(page), page_size: '30' })
    const data = await campaignRequest<{ count: number; results: OwnedMaterial[] }>(`${section === 'character' ? 'characters' : 'campaigns'}/?${params}`, signal)
    return { count: data.count, entries: data.results.map(entry => ownedReference(entry, section)) }
  }
  const params = new URLSearchParams({ type: section, q: query.trim(), page: String(page), page_size: '30' })
  const data = await fetchEncyclopedia<{ count: number; results: EncyclopediaEntry[] }>(`?${params}`, signal)
  return { count: data.count, entries: data.results.map(entryReference) }
}
