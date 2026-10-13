import type { AbilityKey, CharacterSheetDocument } from './characterSheet.types'

const CASTING_ABILITIES: Readonly<Record<string, AbilityKey>> = {
  cleric: 'wisdom', жрец: 'wisdom',
  druid: 'wisdom', друид: 'wisdom',
  ranger: 'wisdom', следопыт: 'wisdom',
  bard: 'charisma', бард: 'charisma',
  sorcerer: 'charisma', чародей: 'charisma',
  warlock: 'charisma', колдун: 'charisma',
  paladin: 'charisma', паладин: 'charisma',
  wizard: 'intelligence', волшебник: 'intelligence',
  'eldritch knight': 'intelligence', 'мистический рыцарь': 'intelligence',
  'arcane trickster': 'intelligence', 'мистический ловкач': 'intelligence',
}

/** Классовая характеристика используется, пока игрок не выбрал другую вручную. */
export function getEffectiveSpellcastingAbility(document: CharacterSheetDocument): AbilityKey {
  const spellcasting = document.spellcasting
  if (spellcasting?.abilityMode === 'manual') return spellcasting.ability
  const className = (document.identity.className || spellcasting?.className || '').trim().toLocaleLowerCase('ru')
  const subclass = document.identity.subclass.trim().toLocaleLowerCase('ru')
  return CASTING_ABILITIES[subclass] ?? CASTING_ABILITIES[className] ?? spellcasting?.ability ?? 'wisdom'
}
