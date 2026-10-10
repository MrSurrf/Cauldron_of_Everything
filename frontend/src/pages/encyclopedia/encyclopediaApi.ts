import type { EncyclopediaEntry } from '../../entities/encyclopedia'
export { fetchEncyclopedia } from '../../entities/encyclopedia'
export type { EncyclopediaEntry } from '../../entities/encyclopedia'

export function entryPath(entry: EncyclopediaEntry): string {
  return `/encyclopedia/${entry.entity_type === 'creature' ? 'creature' : 'entry'}/${entry.entity_type === 'creature' ? encodeURIComponent(entry.slug) : entry.id}`
}
