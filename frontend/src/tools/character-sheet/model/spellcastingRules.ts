import type { RulesetId } from './characterSheet.types'

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type SpellSlotProgression = {
  /** Pact Magic хранится отдельно: все его ячейки имеют один уровень и восстанавливаются после короткого отдыха. */
  kind: 'spellcasting' | 'pactMagic'
  slotsByLevel: Readonly<Partial<Record<SpellSlotLevel, number>>>
  recovery: 'long' | 'short-or-long'
}

// Таблица ячеек полных заклинателей одинакова в базовых правилах 2014 и 2024.
// https://www.dndbeyond.com/sources/dnd/br-2024/character-classes
const FULL_CASTER_SLOTS: readonly (readonly number[])[] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
]

// Количество и уровень ячеек Pact Magic; Mystic Arcanum не является ячейкой.
// https://www.dndbeyond.com/sources/dnd/br-2024/character-classes
const WARLOCK_PACT_SLOTS: readonly (readonly [number, SpellSlotLevel])[] = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3],
  [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5],
  [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

type ClassProgression = 'full' | 'half' | 'half-up' | 'third' | 'pact' | 'none'

// Совпадение полного названия намеренно строгое: запись нескольких классов
// или незнакомая домашняя специализация не должна давать ошибочный максимум.
const CLASS_PROGRESSION: Readonly<Record<string, ClassProgression>> = {
  bard: 'full', бард: 'full',
  cleric: 'full', жрец: 'full',
  druid: 'full', друид: 'full',
  sorcerer: 'full', чародей: 'full',
  wizard: 'full', волшебник: 'full',
  paladin: 'half', паладин: 'half',
  ranger: 'half', следопыт: 'half',
  artificer: 'half-up', изобретатель: 'half-up',
  warlock: 'pact', колдун: 'pact',
  'eldritch knight': 'third', 'fighter (eldritch knight)': 'third',
  'мистический рыцарь': 'third', 'воин (мистический рыцарь)': 'third',
  'arcane trickster': 'third', 'rogue (arcane trickster)': 'third',
  'мистический ловкач': 'third', 'плут (мистический ловкач)': 'third',
  fighter: 'none', воин: 'none',
  rogue: 'none', плут: 'none',
  barbarian: 'none', варвар: 'none',
  monk: 'none', монах: 'none',
}

function toSlotsByLevel(slots: readonly number[]): SpellSlotProgression['slotsByLevel'] {
  return Object.fromEntries(slots.map((count, index) => [index + 1, count]))
}

/**
 * Базовый максимум ячеек персонажа с одним классом, без дополнительных
 * источников магии. `null` означает, что автоматический расчёт невозможен;
 * вызывающий код должен сохранить ручные максимумы. Пустой набор означает
 * известный класс без ячеек на этом уровне.
 */
export function getSingleClassSpellSlots(
  className: string,
  level: number,
  rulesetId: RulesetId,
): SpellSlotProgression | null {
  if (!Number.isInteger(level) || level < 1 || level > 20) return null
  if (rulesetId !== 'dnd5e-2014' && rulesetId !== 'dnd5e-2024') return null

  const normalizedClassName = className.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ')
  const progression = CLASS_PROGRESSION[normalizedClassName]
  if (!progression) return null

  if (progression === 'pact') {
    const [count, slotLevel] = WARLOCK_PACT_SLOTS[level - 1]
    return { kind: 'pactMagic', slotsByLevel: { [slotLevel]: count }, recovery: 'short-or-long' }
  }

  let casterLevel = 0
  if (progression === 'full') casterLevel = level
  if (progression === 'half' && (rulesetId === 'dnd5e-2024' || level >= 2)) {
    casterLevel = Math.ceil(level / 2)
  }
  if (progression === 'half-up') casterLevel = Math.ceil(level / 2)
  if (progression === 'third' && level >= 3) casterLevel = Math.ceil(level / 3)

  return {
    kind: 'spellcasting',
    slotsByLevel: casterLevel ? toSlotsByLevel(FULL_CASTER_SLOTS[casterLevel - 1]) : {},
    recovery: 'long',
  }
}
