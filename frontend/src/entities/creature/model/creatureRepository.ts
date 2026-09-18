import type { CreatureEntity } from './creature'
import { mockTarrasque } from './mockTarrasque'

const creaturesBySlug: ReadonlyMap<
  string,
  CreatureEntity
> = new Map([
  [mockTarrasque.slug, mockTarrasque],
])

export function getCreatureBySlug(
  slug: string,
): CreatureEntity | null {
  return creaturesBySlug.get(slug) ?? null
}
