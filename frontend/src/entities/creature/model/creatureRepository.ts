import type {
  CreatureAbilityKey,
  CreatureAbilityScore,
  CreatureArmorClass,
  CreatureEntity,
  CreatureSection,
  CreatureSectionType,
} from './creature'
import {
  abilityAliases,
  buildDamageAffinities,
  parseConditionList,
  parseFeatureHtml,
  parseSavingThrows,
  parseSenses,
  parseSignedBonusEntries,
  parseSizeTypeAlignment,
} from './creatureDataParsers'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')

type JsonRecord = Record<string, unknown>

type EncyclopediaEntitySummary = {
  entity_type: string
  id: number
  name: string
  name_en: string
  slug: string
}

type EncyclopediaEntityDetail = EncyclopediaEntitySummary & {
  content_html: string
  data: unknown
}

type EncyclopediaListResponse = {
  results: EncyclopediaEntitySummary[]
}

const sectionTypes = new Set<CreatureSectionType>([
  'traits',
  'actions',
  'bonus-actions',
  'reactions',
  'legendary-actions',
  'lair-actions',
  'regional-effects',
  'description',
  'custom',
])

export class CreatureRepositoryError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'CreatureRepositoryError'
    this.status = status
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pick(record: JsonRecord, ...keys: readonly string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }

  return undefined
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

function toStringList(value: unknown): readonly string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map(toText)
      .filter((item): item is string => Boolean(item))

    return items.length > 0 ? items : undefined
  }

  const item = toText(value)
  return item ? [item] : undefined
}

function toStringRecord(
  value: unknown,
): Readonly<Record<string, string>> | undefined {
  if (!isRecord(value)) return undefined

  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key, toText(entryValue)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function toArmorClass(value: unknown): CreatureArmorClass | undefined {
  const source = Array.isArray(value) ? value[0] : value

  if (isRecord(source)) {
    const armorValue = toText(pick(source, 'value', 'armor_class', 'ac'))
    if (!armorValue) return undefined

    return {
      value: /^\d+$/.test(armorValue) ? Number(armorValue) : armorValue,
      details: toStringList(pick(source, 'details', 'type', 'description')),
    }
  }

  const text = toText(source)
  if (!text) return undefined

  const match = text.match(/^\s*(\d+)\s*(?:\(([^)]*)\))?\s*$/)
  return match
    ? {
        value: Number(match[1]),
        details: match[2] ? [match[2].trim()] : undefined,
      }
    : { value: text }
}

function toHitPoints(value: unknown): string | undefined {
  if (isRecord(value)) {
    const total = toText(pick(value, 'average', 'value', 'total', 'hit_points'))
    const formula = toText(pick(value, 'formula', 'dice', 'roll'))

    if (total && formula) return `${total} (${formula})`
    return total ?? formula
  }

  const text = toText(value)
  return text ? normalizeDiceFormulaText(text) : undefined
}

/** Приводит «676 ( 33 к 20 + 330 )» к «676 (33к20 + 330)». */
function normalizeDiceFormulaText(text: string): string {
  return text
    .replace(/(\d)\s+к\s+(\d)/g, '$1к$2')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+,/g, ',')
}

function toSpeed(value: unknown): string | undefined {
  const text = toText(value)
  if (text) return normalizeDiceFormulaText(text).replace(/футов/gi, 'фт.')
  if (!isRecord(value)) return undefined

  const parts = Object.entries(value)
    .map(([movement, movementValue]) => {
      const formattedValue = toText(movementValue)
      return formattedValue ? `${movement} ${formattedValue}` : undefined
    })
    .filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(', ') : undefined
}

function readAbilityScore(value: unknown): CreatureAbilityScore | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { score: value }
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return { score: Number(value) }
  }

  if (!isRecord(value)) return undefined

  const score = Number(pick(value, 'score', 'value'))
  const modifierValue = pick(value, 'modifier', 'mod')
  const modifier = modifierValue == null ? undefined : Number(modifierValue)

  if (!Number.isFinite(score)) return undefined

  return {
    score,
    modifier: Number.isFinite(modifier) ? modifier : undefined,
  }
}

function toAbilities(value: unknown): CreatureEntity['abilities'] {
  if (!isRecord(value)) return undefined

  const normalizedEntries = Object.entries(value).map(
    ([key, entryValue]) => [key.toLocaleLowerCase('ru-RU'), entryValue] as const,
  )
  const abilities: Partial<Record<CreatureAbilityKey, CreatureAbilityScore>> = {}

  for (const [ability, aliases] of Object.entries(abilityAliases) as [
    CreatureAbilityKey,
    readonly string[],
  ][]) {
    const entry = normalizedEntries.find(([key]) => aliases.includes(key))
    const score = entry ? readAbilityScore(entry[1]) : undefined
    if (score) abilities[ability] = score
  }

  return Object.keys(abilities).length > 0 ? abilities : undefined
}

function normalizeSectionType(
  value: unknown,
  title: string,
): CreatureSectionType {
  const explicitType = toText(value)?.toLocaleLowerCase('ru-RU')
  if (explicitType && sectionTypes.has(explicitType as CreatureSectionType)) {
    return explicitType as CreatureSectionType
  }

  const normalizedTitle = title.toLocaleLowerCase('ru-RU')
  if (normalizedTitle.includes('легендар')) return 'legendary-actions'
  if (normalizedTitle.includes('логов')) return 'lair-actions'
  if (normalizedTitle.includes('региональ')) return 'regional-effects'
  if (normalizedTitle.includes('бонус')) return 'bonus-actions'
  if (normalizedTitle.includes('реакц')) return 'reactions'
  if (normalizedTitle.includes('действ')) return 'actions'
  if (normalizedTitle.includes('особен')) return 'traits'
  if (normalizedTitle.includes('описан')) return 'description'
  return 'custom'
}

// Порядок секций статблока: собираются из выделенных *_html полей датасета,
// а не из data.sections, где у первой секции нет заголовка, а типов нет вовсе.
const sectionFieldOrder: readonly {
  key: string
  type: CreatureSectionType
  title: string
}[] = [
  { key: 'traits_html', type: 'traits', title: 'Особенности' },
  { key: 'actions_html', type: 'actions', title: 'Действия' },
  { key: 'bonus_actions_html', type: 'bonus-actions', title: 'Бонусные действия' },
  { key: 'reactions_html', type: 'reactions', title: 'Реакции' },
  { key: 'legendary_actions_html', type: 'legendary-actions', title: 'Легендарные действия' },
  { key: 'lair_actions_html', type: 'lair-actions', title: 'Действия логова' },
  { key: 'regional_effects_html', type: 'regional-effects', title: 'Региональные эффекты' },
  { key: 'description_html', type: 'description', title: 'Описание' },
]

function withParsedEntries(section: CreatureSection): CreatureSection {
  if (section.type === 'description' || section.type === 'custom') return section

  const parsed = parseFeatureHtml(section.html, section.id)
  if (!parsed || parsed.entries.length === 0) return section

  return {
    ...section,
    entries: parsed.entries,
    introduction: parsed.introduction ?? section.introduction,
  }
}

function toSections(
  data: JsonRecord,
  fallbackHtml: string,
  slug: string,
): readonly CreatureSection[] {
  const fromFields = sectionFieldOrder.flatMap(({ key, type, title }): CreatureSection[] => {
    const html = toText(data[key])
    if (!html) return []

    return [withParsedEntries({ id: `${slug}-${type}`, type, title, html })]
  })
  if (fromFields.length > 0) return fromFields

  const sections = Array.isArray(data.sections)
    ? data.sections.flatMap((section, index): CreatureSection[] => {
        if (!isRecord(section)) return []

        // У первой секции датасета title = null — это особенности.
        const title = toText(pick(section, 'title', 'name'))
          ?? (index === 0 ? 'Особенности' : `Раздел ${index + 1}`)
        const html = toText(pick(section, 'html', 'content_html', 'content'))
        if (!html) return []

        return [withParsedEntries({
          id: toText(section.id) ?? `${slug}-section-${index + 1}`,
          type: normalizeSectionType(section.type, title),
          title,
          html,
        })]
      })
    : []

  // content_html — полная карточка, а не отдельное описание существа.
  // Используем её только при отсутствии читаемых секций и в основной колонке.
  if (fallbackHtml.trim() && sections.length === 0) {
    return [
      {
        id: `${slug}-content`,
        type: 'custom',
        title: 'Статблок',
        html: fallbackHtml,
      },
    ]
  }

  return sections
}

function toSavingThrows(
  value: unknown,
): CreatureEntity['savingThrows'] {
  const text = toText(value)
  if (text) {
    const parsed = parseSavingThrows(text)
    if (parsed) return parsed
  }

  return toStringRecord(value) as CreatureEntity['savingThrows']
}

function toSkills(value: unknown): CreatureEntity['skills'] {
  const text = toText(value)
  if (text) {
    const parsed = parseSignedBonusEntries(text)
    if (parsed) return parsed
  }

  return toStringRecord(value)
}

function toCreatureEntity(detail: EncyclopediaEntityDetail): CreatureEntity {
  const data = isRecord(detail.data) ? detail.data : {}

  const sensesText = toText(pick(data, 'senses'))
  const parsedSenses = sensesText ? parseSenses(sensesText) : undefined

  const vulnerabilitiesText = toText(pick(data, 'damage_vulnerabilities', 'damageVulnerabilities'))
  const resistancesText = toText(pick(data, 'damage_resistances', 'damageResistances'))
  const immunitiesText = toText(pick(data, 'damage_immunities', 'damageImmunities'))
  const damageAffinities = buildDamageAffinities({
    vulnerabilities: vulnerabilitiesText,
    resistances: resistancesText,
    immunities: immunitiesText,
  })

  // У части сущностей таксономия не разнесена по полям — читаем объединённую строку.
  const sizeTypeAlignment = toText(pick(data, 'size_type_alignment'))
  const taxonomyFallback = sizeTypeAlignment
    ? parseSizeTypeAlignment(sizeTypeAlignment)
    : undefined

  return {
    id: String(detail.id),
    entityType: 'creature',
    slug: detail.slug,
    name: detail.name,
    nameEn: detail.name_en || undefined,
    size: toText(pick(data, 'size')) ?? taxonomyFallback?.size,
    creatureType: toText(pick(data, 'creature_type', 'creatureType', 'type')) ?? taxonomyFallback?.creatureType,
    alignment: toText(pick(data, 'alignment')) ?? taxonomyFallback?.alignment,
    armorClass: toArmorClass(pick(data, 'armor_class', 'armorClass', 'ac')),
    hitPoints: toHitPoints(pick(data, 'hit_points', 'hitPoints', 'hp')),
    speed: toSpeed(pick(data, 'speed', 'movement')),
    abilities: toAbilities(pick(data, 'abilities', 'ability_scores', 'stats')),
    savingThrows: toSavingThrows(pick(data, 'saving_throws', 'savingThrows', 'saves')),
    skills: toSkills(pick(data, 'skills')),
    // Распарсенные в бейджи строки примечаниями не дублируем;
    // в примечания уходят только нераспознанные фрагменты.
    damageVulnerabilities: vulnerabilitiesText
      ? (damageAffinities.vulnerabilities.length > 0 ? damageAffinities.vulnerabilities : undefined)
      : toStringList(pick(data, 'damage_vulnerabilities', 'damageVulnerabilities')),
    damageResistances: resistancesText
      ? (damageAffinities.resistances.length > 0 ? damageAffinities.resistances : undefined)
      : toStringList(pick(data, 'damage_resistances', 'damageResistances')),
    damageImmunities: immunitiesText
      ? (damageAffinities.immunities.length > 0 ? damageAffinities.immunities : undefined)
      : toStringList(pick(data, 'damage_immunities', 'damageImmunities')),
    damageAffinities: damageAffinities.affinities.length > 0
      ? damageAffinities.affinities
      : undefined,
    conditionImmunities: (() => {
      const raw = pick(data, 'condition_immunities', 'conditionImmunities')
      const text = toText(raw)
      return (text ? parseConditionList(text) : undefined) ?? toStringList(raw)
    })(),
    vision: parsedSenses && parsedSenses.vision.length > 0
      ? parsedSenses.vision
      : undefined,
    senses: sensesText
      ? (parsedSenses && parsedSenses.notes.length > 0 ? parsedSenses.notes : undefined)
      : toStringList(pick(data, 'senses')),
    passivePerception: parsedSenses?.passivePerception,
    languages: toStringList(pick(data, 'languages')),
    challengeRating: toText(pick(data, 'challenge_rating', 'challengeRating', 'cr')),
    proficiencyBonus: toText(pick(data, 'proficiency_bonus', 'proficiencyBonus')),
    habitat: toStringList(pick(data, 'habitat', 'environments')),
    sections: toSections(data, detail.content_html || '', detail.slug),
  }
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new CreatureRepositoryError(
      `API энциклопедии ответил ${response.status}`,
      response.status,
    )
  }

  return response.json() as Promise<T>
}

export async function getCreatureBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<CreatureEntity | null> {
  const search = new URLSearchParams({
    type: 'creature',
    slug,
    page_size: '1',
  })
  const list = await requestJson<EncyclopediaListResponse>(
    `${API_BASE_URL}/api/encyclopedia/?${search}`,
    signal,
  )
  const summary = list.results.find((entity) => (
    entity.entity_type === 'creature' && entity.slug === slug
  ))

  if (!summary) return null

  const detail = await requestJson<EncyclopediaEntityDetail>(
    `${API_BASE_URL}/api/encyclopedia/${summary.id}/`,
    signal,
  )

  if (detail.entity_type !== 'creature') return null
  return toCreatureEntity(detail)
}
