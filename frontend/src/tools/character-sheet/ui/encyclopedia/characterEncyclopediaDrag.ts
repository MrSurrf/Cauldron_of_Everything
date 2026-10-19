import type { EncyclopediaEntry } from '../../../../entities/encyclopedia'

export const CHARACTER_ENCYCLOPEDIA_DRAG_TYPE = 'application/x-cauldron-character-encyclopedia'
export const CHARACTER_ENCYCLOPEDIA_SPELL_DRAG_TYPE = 'application/x-cauldron-character-encyclopedia-spell'

const CHARACTER_ENCYCLOPEDIA_MODES = ['item', 'spell', 'class', 'race', 'background'] as const
export type CharacterEncyclopediaMode = typeof CHARACTER_ENCYCLOPEDIA_MODES[number]
export type CharacterIdentityEncyclopediaMode = Extract<CharacterEncyclopediaMode, 'class' | 'race' | 'background'>

function isCharacterEncyclopediaMode(value: unknown): value is CharacterEncyclopediaMode {
  return CHARACTER_ENCYCLOPEDIA_MODES.some((mode) => mode === value)
}

export type CharacterEncyclopediaEntry = {
  id: number
  entityType: CharacterEncyclopediaMode
  name: string
  nameEn: string
  level: number | null
  summary: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function spellLevel(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 9) return value
  if (typeof value !== 'string') return null
  if (/заговор|cantrip/i.test(value)) return 0
  const match = value.match(/\d+/)
  if (!match) return null
  const level = Number(match[0])
  return level >= 0 && level <= 9 ? level : null
}

export function toCharacterEncyclopediaEntry(entry: EncyclopediaEntry): CharacterEncyclopediaEntry | null {
  if (!isCharacterEncyclopediaMode(entry.entity_type)) return null
  const summary = isRecord(entry.summary) ? entry.summary : isRecord(entry.data) ? entry.data : {}
  return {
    id: entry.id,
    entityType: entry.entity_type,
    name: entry.name,
    nameEn: entry.name_en ?? '',
    level: entry.entity_type === 'spell' ? spellLevel(summary.level) : null,
    summary,
  }
}

export function writeCharacterEncyclopediaDrag(dataTransfer: DataTransfer, entry: CharacterEncyclopediaEntry): void {
  dataTransfer.setData(CHARACTER_ENCYCLOPEDIA_DRAG_TYPE, JSON.stringify(entry))
  dataTransfer.setData(`${CHARACTER_ENCYCLOPEDIA_DRAG_TYPE}-${entry.entityType}`, '1')
  dataTransfer.setData('text/plain', entry.name)
  dataTransfer.effectAllowed = 'copy'
}

export function hasCharacterEncyclopediaDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(CHARACTER_ENCYCLOPEDIA_DRAG_TYPE)
}

export function hasCharacterEncyclopediaSpellDrag(dataTransfer: DataTransfer): boolean {
  return hasCharacterEncyclopediaTypeDrag(dataTransfer, 'spell')
}

export function hasCharacterEncyclopediaTypeDrag(dataTransfer: DataTransfer, mode: CharacterEncyclopediaMode): boolean {
  return hasCharacterEncyclopediaDrag(dataTransfer)
    && Array.from(dataTransfer.types).includes(`${CHARACTER_ENCYCLOPEDIA_DRAG_TYPE}-${mode}`)
}

export function readCharacterEncyclopediaDrag(dataTransfer: DataTransfer): CharacterEncyclopediaEntry | null {
  const raw = dataTransfer.getData(CHARACTER_ENCYCLOPEDIA_DRAG_TYPE)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || !isCharacterEncyclopediaMode(value.entityType)
      || !Number.isSafeInteger(value.id) || Number(value.id) < 1
      || typeof value.name !== 'string' || !value.name.trim()) return null
    return {
      id: Number(value.id),
      entityType: value.entityType,
      name: value.name,
      nameEn: typeof value.nameEn === 'string' ? value.nameEn : '',
      level: value.entityType === 'spell' ? spellLevel(value.level) : null,
      summary: isRecord(value.summary) ? value.summary : {},
    }
  } catch {
    return null
  }
}
