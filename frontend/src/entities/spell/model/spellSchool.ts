export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

export const SPELL_SCHOOL_LABELS: Record<SpellSchool, string> = {
  abjuration: 'Ограждение',
  conjuration: 'Вызов',
  divination: 'Прорицание',
  enchantment: 'Очарование',
  evocation: 'Воплощение',
  illusion: 'Иллюзия',
  necromancy: 'Некромантия',
  transmutation: 'Преобразование',
}

const schoolsByName: Record<string, SpellSchool> = {
  abjuration: 'abjuration',
  ограждение: 'abjuration',
  ограждения: 'abjuration',
  преграждение: 'abjuration',
  преграждения: 'abjuration',
  conjuration: 'conjuration',
  вызов: 'conjuration',
  вызова: 'conjuration',
  призыв: 'conjuration',
  призывание: 'conjuration',
  divination: 'divination',
  прорицание: 'divination',
  прорицания: 'divination',
  предсказание: 'divination',
  enchantment: 'enchantment',
  очарование: 'enchantment',
  очарования: 'enchantment',
  evocation: 'evocation',
  воплощение: 'evocation',
  воплощения: 'evocation',
  эвокация: 'evocation',
  illusion: 'illusion',
  иллюзия: 'illusion',
  иллюзии: 'illusion',
  necromancy: 'necromancy',
  некромантия: 'necromancy',
  некромантии: 'necromancy',
  transmutation: 'transmutation',
  преобразование: 'transmutation',
  преобразования: 'transmutation',
  превращение: 'transmutation',
  превращения: 'transmutation',
  трансмутация: 'transmutation',
}

function schoolKey(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/^школа\s*:?\s*/, '')
    .replace(/^school\s+(?:of\s+)?/, '')
    .replace(/\s+/g, ' ')
}

/** Возвращает одну из восьми базовых школ, не угадывая неизвестные значения. */
export function getSpellSchool(value: string | null | undefined): SpellSchool | undefined {
  if (!value?.trim()) return undefined
  const candidates = [value, ...value.split(/[()[\]{}/,;|]+/)]
    .map(schoolKey)
    .filter(Boolean)
  for (const candidate of candidates) {
    if (Object.hasOwn(schoolsByName, candidate)) return schoolsByName[candidate]
  }
  return undefined
}

/** Канонизирует известную школу, но не уничтожает незнакомое значение источника. */
export function spellSchoolLabel(value: string | null | undefined): string {
  const school = getSpellSchool(value)
  return school ? SPELL_SCHOOL_LABELS[school] : value?.trim() ?? ''
}
