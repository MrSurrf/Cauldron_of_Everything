import type { EncyclopediaEntry } from '../../../../entities/encyclopedia'
import { emptyItem, itemToSource, type ContentItemValue } from '../../../../shared/ui/ContentEditor'
import { createClientId, type SpellEntry, type SpellLevel } from '../../model'
import type { CharacterEncyclopediaEntry } from './characterEncyclopediaDrag'

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number') return String(value)
  return undefined
}

function firstString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringValue(data[key])
    if (value) return value
  }
  return undefined
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (/^(true|yes|да)$/i.test(value.trim())) return true
    if (/^(false|no|нет)$/i.test(value.trim())) return false
  }
  return undefined
}

function componentsValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean).join(', ') || undefined
  return stringValue(value)
}

export function equipmentItemSource(entry: CharacterEncyclopediaEntry): string {
  return itemToSource({
    ...emptyItem,
    title: entry.name,
    itemType: firstString(entry.summary, 'classification', 'item_type', 'type') ?? '',
    rarity: firstString(entry.summary, 'rarity') ?? '',
  }, {
    'entity-id': String(entry.id),
    'name-en': encodeURIComponent(entry.nameEn),
  })
}

export function createSpellFromEncyclopedia(entry: CharacterEncyclopediaEntry): SpellEntry | null {
  if (entry.level === null || !Number.isInteger(entry.level) || entry.level < 0 || entry.level > 9) return null
  const level = entry.level as SpellLevel
  const summary = entry.summary
  return {
    id: createClientId('spell'),
    entityId: entry.id,
    name: entry.name,
    nameEn: entry.nameEn,
    level,
    prepared: level === 0,
    school: firstString(summary, 'school'),
    castingTime: firstString(summary, 'casting_time', 'cast_time', 'time'),
    duration: firstString(summary, 'duration'),
    range: firstString(summary, 'range', 'distance'),
    components: componentsValue(summary.components),
    concentration: booleanValue(summary.concentration),
    ritual: booleanValue(summary.ritual),
  }
}

export function equipmentDetailPatch(detail: EncyclopediaEntry): Partial<ContentItemValue> {
  const data = detail.data ?? {}
  return {
    description: detail.content_text?.trim() || undefined,
    itemType: firstString(data, 'classification', 'item_type', 'type'),
    rarity: firstString(data, 'rarity'),
    cost: firstString(data, 'cost', 'price'),
  }
}

export function spellDetailPatch(detail: EncyclopediaEntry): Partial<SpellEntry> {
  const data = detail.data ?? detail.summary ?? {}
  const patch: Partial<SpellEntry> = {}
  const description = detail.content_text?.trim()
  const school = firstString(data, 'school')
  const castingTime = firstString(data, 'casting_time', 'cast_time', 'time')
  const duration = firstString(data, 'duration')
  const range = firstString(data, 'range', 'distance')
  const components = componentsValue(data.components)
  const concentration = booleanValue(data.concentration)
  const ritual = booleanValue(data.ritual)
  const source = firstString(data, 'source')
  if (description) patch.description = description
  if (school) patch.school = school
  if (castingTime) patch.castingTime = castingTime
  if (duration) patch.duration = duration
  if (range) patch.range = range
  if (components) patch.components = components
  if (concentration !== undefined) patch.concentration = concentration
  if (ritual !== undefined) patch.ritual = ritual
  if (source) patch.source = source
  return patch
}
