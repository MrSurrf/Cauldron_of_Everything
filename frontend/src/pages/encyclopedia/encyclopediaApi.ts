import type { EncyclopediaEntry } from '../../entities/encyclopedia'
export { fetchEncyclopedia } from '../../entities/encyclopedia'
export type { EncyclopediaEntry } from '../../entities/encyclopedia'

export function entryPath(entry: EncyclopediaEntry): string {
  if (entry.entity_type === 'creature' || entry.entity_type === 'item' || entry.entity_type === 'class') {
    return `/encyclopedia/${entry.entity_type}/${encodeURIComponent(entry.slug)}`
  }
  return `/encyclopedia/entry/${entry.id}`
}
