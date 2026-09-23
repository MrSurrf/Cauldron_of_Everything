import type {
  CreatureAbilityKey,
  CreatureEntity,
} from '../model/creature'

export const creatureAbilityLabels: Readonly<
  Record<CreatureAbilityKey, {
    abbreviation: string
    label: string
  }>
> = {
  strength: {
    abbreviation: 'СИЛ',
    label: 'Сила',
  },
  dexterity: {
    abbreviation: 'ЛОВ',
    label: 'Ловкость',
  },
  constitution: {
    abbreviation: 'ТЕЛ',
    label: 'Телосложение',
  },
  intelligence: {
    abbreviation: 'ИНТ',
    label: 'Интеллект',
  },
  wisdom: {
    abbreviation: 'МДР',
    label: 'Мудрость',
  },
  charisma: {
    abbreviation: 'ХАР',
    label: 'Харизма',
  },
}

export function formatSignedNumber(value: number) {
  return value >= 0 ? `+${value}` : String(value)
}

export function getAbilityModifier(
  score: number,
) {
  return Math.floor((score - 10) / 2)
}

export function getCreatureTaxonomy(
  entity: CreatureEntity,
) {
  return [
    entity.size,
    entity.creatureType,
    entity.alignment,
  ]
    .filter(Boolean)
    .join(', ')
}

export function formatCreatureSkills(
  skills: CreatureEntity['skills'],
) {
  if (!skills) return ''

  return Object.entries(skills)
    .map(([name, bonus]) => `${name} ${bonus}`)
    .join(', ')
}

export function formatCreatureSpeeds(speed: CreatureEntity['speed']) {
  if (!speed?.trim()) return []

  // Не разбиваем уточнения в скобках; нестандартную запись оставляем целиком.
  return speed.split(/,\s*(?![^()]*\))/).filter((part) => part.trim()).map((part) => {
    const match = part.trim().match(/^(.*?)\s*(\d+\s*фт\.)(.*)$/i)
    if (!match) return { value: part.trim(), label: '' }
    return {
      value: `${match[2]}${match[3]}`,
      label: match[1] || 'ходьба',
    }
  })
}
