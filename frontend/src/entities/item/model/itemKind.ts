export type ItemKind = 'wand' | 'armor' | 'scroll' | 'potion' | 'ring' | 'wondrous' | 'staff' | 'rod' | 'weapon'

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  wand: 'Волшебная палочка',
  armor: 'Доспех',
  scroll: 'Свиток',
  potion: 'Зелье',
  ring: 'Кольцо',
  wondrous: 'Маг. безделушка',
  staff: 'Посох',
  rod: 'Жезл',
  weapon: 'Оружие',
}

const kindsByClassification: Record<string, ItemKind> = {
  'волшебная палочка': 'wand',
  wand: 'wand',
  'доспех': 'armor',
  'доспехи': 'armor',
  armor: 'armor',
  armour: 'armor',
  'свиток': 'scroll',
  scroll: 'scroll',
  'зелье': 'potion',
  potion: 'potion',
  'кольцо': 'ring',
  ring: 'ring',
  'маг. безделушка': 'wondrous',
  'магическая безделушка': 'wondrous',
  'волшебная безделушка': 'wondrous',
  'чудесный предмет': 'wondrous',
  'wondrous item': 'wondrous',
  'посох': 'staff',
  staff: 'staff',
  'жезл': 'rod',
  rod: 'rod',
  'оружие': 'weapon',
  weapon: 'weapon',
}

/** Тип стоит в начале классификации; скобки и запятые отделяют подтип и редкость. */
export function getItemKind(classification: string | undefined): ItemKind | undefined {
  if (!classification) return undefined
  const category = classification
    .split(/[([,;:]/, 1)[0]
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
  return Object.hasOwn(kindsByClassification, category) ? kindsByClassification[category] : undefined
}
