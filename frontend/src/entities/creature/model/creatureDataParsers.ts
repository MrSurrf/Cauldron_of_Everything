import type { VisionSense, VisionType } from '../../../shared/model'
import type {
  CreatureAbilityKey,
  CreatureFeature,
  DamageAffinity,
  DamageAffinityState,
  DamageType,
} from './creature'

// Алиасы характеристик: именительный падеж (блок характеристик),
// сокращения (строка спасбросков) и родительный падеж («спасбросок Силы Сл 20»).
export const abilityAliases: Readonly<
  Record<CreatureAbilityKey, readonly string[]>
> = {
  strength: ['strength', 'str', 'сила', 'сил', 'силы'],
  dexterity: ['dexterity', 'dex', 'ловкость', 'лов', 'ловкости'],
  constitution: ['constitution', 'con', 'телосложение', 'тел', 'телосложения'],
  intelligence: ['intelligence', 'int', 'интеллект', 'инт', 'интеллекта'],
  wisdom: ['wisdom', 'wis', 'мудрость', 'мдр', 'мудрости'],
  charisma: ['charisma', 'cha', 'харизма', 'хар', 'харизмы'],
}

export function resolveAbilityKey(name: string): CreatureAbilityKey | undefined {
  const normalized = name.trim().toLocaleLowerCase('ru-RU')
  for (const [ability, aliases] of Object.entries(abilityAliases) as [
    CreatureAbilityKey,
    readonly string[],
  ][]) {
    if (aliases.includes(normalized)) return ability
  }
  return undefined
}

/** Разбирает строки вида «Восприятие +3, Скрытность +7» в словарь. */
export function parseSignedBonusEntries(
  text: string,
): Readonly<Record<string, string>> | undefined {
  const entries = text
    .split(/[,;]/)
    .map((part) => part.trim().match(/^(.*?)\s*([+-]\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match?.[1]))
    .map((match) => [match[1].trim(), match[2]] as const)

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function parseSavingThrows(
  text: string,
): Partial<Record<CreatureAbilityKey, string>> | undefined {
  const entries = parseSignedBonusEntries(text)
  if (!entries) return undefined

  const result: Partial<Record<CreatureAbilityKey, string>> = {}
  for (const [name, bonus] of Object.entries(entries)) {
    const ability = resolveAbilityKey(name)
    if (ability) result[ability] = bonus
  }

  return Object.keys(result).length > 0 ? result : undefined
}

const visionAliases: readonly (readonly [string, VisionType])[] = [
  ['тёмное зрение', 'darkvision'],
  ['темное зрение', 'darkvision'],
  ['истинное зрение', 'truesight'],
  ['слепое зрение', 'blindsight'],
  ['чувство вибрации', 'tremorsense'],
]

export type ParsedSenses = {
  vision: readonly VisionSense[]
  passivePerception?: number
  notes: readonly string[]
}

/** Разбирает строку чувств «тёмное зрение ? 60 футов , пассивное Восприятие 13». */
export function parseSenses(text: string): ParsedSenses {
  const vision: VisionSense[] = []
  const notes: string[] = []
  let passivePerception: number | undefined

  for (const rawPart of text.split(',')) {
    // «?» — артефакт выгрузки тултипов dnd.su, смысла не несёт.
    const part = rawPart.replace(/\?/g, '').replace(/\s+/g, ' ').trim()
    if (!part) continue

    const passive = part.match(/пассивн[а-яё]*\s+восприятие\s+(\d+)/i)
    if (passive) {
      passivePerception = Number(passive[1])
      continue
    }

    const lowered = part.toLocaleLowerCase('ru-RU')
    const alias = visionAliases.find(([name]) => lowered.includes(name))
    if (alias) {
      const range = part.match(/(\d+)\s*(?:футов|фт)/i)
      vision.push({
        type: alias[1],
        range: range ? Number(range[1]) : undefined,
      })
      continue
    }

    notes.push(part)
  }

  return { vision, passivePerception, notes }
}

// Именительный падеж (строки сопротивлений/иммунитетов).
const damageTypeAliases: readonly (readonly [string, DamageType])[] = [
  ['некротическая энергия', 'necrotic'],
  ['психическая энергия', 'psychic'],
  ['силовое поле', 'force'],
  ['дробящий', 'bludgeoning'],
  ['колющий', 'piercing'],
  ['рубящий', 'slashing'],
  ['электричество', 'lightning'],
  ['излучение', 'radiant'],
  ['кислота', 'acid'],
  ['холод', 'cold'],
  ['огонь', 'fire'],
  ['звук', 'thunder'],
  ['гром', 'thunder'],
  ['молния', 'lightning'],
  ['яд', 'poison'],
]

// Творительный падеж для формулировок «урон ядом 45 (10к8)».
const damageTypeInstrumentalAliases: readonly (readonly [string, DamageType])[] = [
  ['некротической энергией', 'necrotic'],
  ['психической энергией', 'psychic'],
  ['силовым полем', 'force'],
  ['дробящим', 'bludgeoning'],
  ['колющим', 'piercing'],
  ['рубящим', 'slashing'],
  ['электричеством', 'lightning'],
  ['излучением', 'radiant'],
  ['кислотой', 'acid'],
  ['холодом', 'cold'],
  ['огнём', 'fire'],
  ['огнем', 'fire'],
  ['звуком', 'thunder'],
  ['громом', 'thunder'],
  ['молнией', 'lightning'],
  ['ядом', 'poison'],
]

const PHYSICAL_DAMAGE_TYPES: readonly DamageType[] = [
  'bludgeoning',
  'piercing',
  'slashing',
]

const affinityStatePriority: Readonly<Record<DamageAffinityState, number>> = {
  normal: 0,
  vulnerability: 1,
  resistance: 2,
  immunity: 3,
}

export type ParsedDamageAffinities = {
  affinities: readonly DamageAffinity[]
  /** Нераспознанные фрагменты — выводятся текстовыми примечаниями, как раньше. */
  vulnerabilities: readonly string[]
  resistances: readonly string[]
  immunities: readonly string[]
}

function parseAffinityString(
  text: string,
  state: DamageAffinityState,
  into: Map<DamageType, { physical: DamageAffinityState; magical: DamageAffinityState }>,
): readonly string[] {
  const notes: string[] = []

  for (const clause of text.split(';')) {
    if (!clause.trim()) continue

    // Оговорка действует на всё предложение: «дробящий, колющий, рубящий от немагических атак».
    const loweredClause = clause.toLocaleLowerCase('ru-RU')
    const caveat = /немагическ/.test(loweredClause)
      ? 'nonmagical'
      : /магическ|заклинан/.test(loweredClause)
        ? 'magical'
        : undefined

    const cleanedClause = clause
      .replace(/от\s+(?:не)?магическ[а-яё]+(?:\s+атак|\s+оружия)?/gi, ' ')
      .replace(/(?:не)?магическ[а-яё]+/gi, ' ')

    for (const rawFragment of cleanedClause.split(',')) {
      const fragment = rawFragment.replace(/\s+/g, ' ').trim()
      if (!fragment) continue

      const lowered = fragment.toLocaleLowerCase('ru-RU')
      const alias = damageTypeAliases.find(([name]) => lowered.startsWith(name))
      if (!alias) {
        notes.push(fragment)
        continue
      }

      const damageType = alias[1]
      const leftover = fragment.slice(alias[0].length).replace(/^[,\s]+/, '').trim()
      if (leftover) notes.push(leftover)

      let physical: DamageAffinityState = state
      let magical: DamageAffinityState = state
      if (PHYSICAL_DAMAGE_TYPES.includes(damageType)) {
        if (caveat === 'nonmagical') magical = 'normal'
        if (caveat === 'magical') physical = 'normal'
      }

      const current = into.get(damageType)
      into.set(damageType, {
        physical: current && affinityStatePriority[current.physical] > affinityStatePriority[physical]
          ? current.physical
          : physical,
        magical: current && affinityStatePriority[current.magical] > affinityStatePriority[magical]
          ? current.magical
          : magical,
      })
    }
  }

  return notes
}

/** Собирает бейджи сопротивлений/иммунитетов/уязвимостей из строк датасета. */
export function buildDamageAffinities(fields: {
  vulnerabilities?: string
  resistances?: string
  immunities?: string
}): ParsedDamageAffinities {
  const states = new Map<DamageType, { physical: DamageAffinityState; magical: DamageAffinityState }>()

  const vulnerabilities = fields.vulnerabilities
    ? parseAffinityString(fields.vulnerabilities, 'vulnerability', states)
    : []
  const resistances = fields.resistances
    ? parseAffinityString(fields.resistances, 'resistance', states)
    : []
  const immunities = fields.immunities
    ? parseAffinityString(fields.immunities, 'immunity', states)
    : []

  const affinities: DamageAffinity[] = []
  for (const [damageType, state] of states) {
    affinities.push({ damageType, ...state })
  }

  return { affinities, vulnerabilities, resistances, immunities }
}

/** Чистит список иммунитетов к состояниям от артефактов выгрузки. */
export function parseConditionList(text: string): readonly string[] | undefined {
  const items = text
    .split(/[,;]/)
    .map((part) => part.replace(/\?/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return items.length > 0 ? items : undefined
}

const SIZE_WORD_PATTERN = /^(крошечн[а-яё]+|маленьк[а-яё]+|средн[а-яё]+|больш[а-яё]+|огромн[а-яё]+|громадн[а-яё]+)\s+(.+)$/is

function splitOutsideParens(text: string): readonly string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts
}

/** Фолбэк-таксономия: «Громадный  Монстр (титан), без мировоззрения». */
export function parseSizeTypeAlignment(text: string): {
  size?: string
  creatureType?: string
  alignment?: string
} {
  const parts = splitOutsideParens(text)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (parts.length === 0) return {}

  const first = parts[0]
  const sizeMatch = first.match(SIZE_WORD_PATTERN)
  const size = sizeMatch?.[1]
  const creatureType = (sizeMatch ? sizeMatch[2] : first) || undefined
  const alignment = parts.slice(1).join(', ') || undefined

  return { size, creatureType, alignment }
}

const ATTACK_SUBTITLE_PATTERN = /^(?:(?:рукопашная|дальнобойная)(?:\s+или\s+(?:рукопашная|дальнобойная))?\s+)?атака\s+(?:оружием|заклинанием)\s*:?$/i
const USAGE_PATTERN = /\((перезарядка[^)]*|\d+\s*\/\s*день|стоит[^)]*)\)/i

const damageNominativePattern = /(дробящий|колющий|рубящий)\s+урон\s+(\d+)\s*\(\s*([^()]+?)\s*\)/gi
const damageInstrumentalPattern = new RegExp(
  `урон\\s+(${damageTypeInstrumentalAliases.map(([name]) => name).join('|')})\\s+(\\d+)\\s*\\(\\s*([^()]+?)\\s*\\)`,
  'gi',
)

function normalizeFormula(formula: string): string {
  return formula.replace(/\s+/g, ' ').trim()
}

function findDamageType(name: string): DamageType | undefined {
  const lowered = name.toLocaleLowerCase('ru-RU')
  return (
    damageTypeAliases.find(([alias]) => alias === lowered)?.[1] ??
    damageTypeInstrumentalAliases.find(([alias]) => alias === lowered)?.[1]
  )
}

function extractDamage(text: string): CreatureFeature['damage'] {
  const found: { index: number; type: DamageType; average: number; formula: string }[] = []

  for (const match of text.matchAll(damageNominativePattern)) {
    const type = findDamageType(match[1])
    if (type) {
      found.push({ index: match.index ?? 0, type, average: Number(match[2]), formula: normalizeFormula(match[3]) })
    }
  }
  for (const match of text.matchAll(damageInstrumentalPattern)) {
    const type = findDamageType(match[1])
    if (type) {
      found.push({ index: match.index ?? 0, type, average: Number(match[2]), formula: normalizeFormula(match[3]) })
    }
  }

  found.sort((a, b) => a.index - b.index)
  return found.length > 0
    ? found.map(({ type, average, formula }) => ({ type, average, formula }))
    : undefined
}

const paragraphText = (element: Element): string =>
  (element.textContent ?? '').replace(/\s+/g, ' ').trim()

type ParsedFeatureBlock = {
  entries: CreatureFeature[]
  introduction?: string
}

/**
 * Разбирает блок *_html датасета (div с абзацами <p>) в структурированные feature.
 * Возвращает undefined, если DOMParser недоступен (node-окружение тестов)
 * или блок содержит неабзацную разметку (списки, таблицы) — тогда секция
 * целиком рендерится исходным HTML без потери контента.
 */
export function parseFeatureHtml(
  html: string,
  sectionId: string,
): ParsedFeatureBlock | undefined {
  if (typeof DOMParser === 'undefined') return undefined

  const doc = new DOMParser().parseFromString(html, 'text/html')
  // Типичная обёртка датасета — единственный <div> с абзацами внутри.
  const wrapper =
    doc.body.children.length === 1 && doc.body.children[0].tagName === 'DIV'
      ? doc.body.children[0]
      : doc.body
  const blocks = Array.from(wrapper.children).filter(
    (child) => child.tagName !== 'BR' && paragraphText(child) !== '',
  )
  if (blocks.length === 0) return undefined
  if (blocks.some((child) => child.tagName !== 'P')) return undefined

  const entries: CreatureFeature[] = []
  const introductionParts: string[] = []

  for (const block of blocks) {
    const paragraph = block.cloneNode(true) as Element
    paragraph.querySelectorAll('sup').forEach((node) => node.remove())

    // Имя feature — это <em>/<strong> в самом начале абзаца (вложенность бывает любой).
    // Страховка по длине отсекает абзацы, начинающиеся с длинного курсива, — это не имя.
    let headerText = ''
    const candidate = paragraph.firstElementChild
    const precededOnlyByWhitespace = candidate
      ? Array.from(paragraph.childNodes)
          .slice(0, Array.prototype.indexOf.call(paragraph.childNodes, candidate))
          .every((node) => node.nodeType === 3 && !(node.textContent ?? '').trim())
      : false
    if (
      candidate &&
      (candidate.tagName === 'EM' || candidate.tagName === 'STRONG') &&
      precededOnlyByWhitespace
    ) {
      const text = paragraphText(candidate)
      if (text && text.length <= 90) {
        headerText = text
        candidate.remove()
      }
    }
    const bodyText = paragraphText(paragraph)

    if (!headerText) {
      // Абзац без имени: вступление секции или продолжение предыдущей feature.
      if (entries.length === 0) {
        if (bodyText) introductionParts.push(bodyText)
      } else if (bodyText) {
        const previous = entries[entries.length - 1]
        entries[entries.length - 1] = {
          ...previous,
          description: `${previous.description} ${bodyText}`.trim(),
        }
      }
      continue
    }

    const nameMatch = headerText.match(/^(.*?\.)\s+(.*)$/s)
    let name = (nameMatch ? nameMatch[1] : headerText).trim()
    let rest = (nameMatch ? nameMatch[2] : '').trim()

    // «Легендарное сопротивление (3/день).» → usage.
    const usageMatch = name.match(USAGE_PATTERN)
    let usage: string | undefined
    if (usageMatch?.[1]) {
      usage = usageMatch[1].trim()
      name = name.replace(USAGE_PATTERN, '').replace(/\s+\./, '.').trim()
    }

    let subtitle: string | undefined
    if (rest && ATTACK_SUBTITLE_PATTERN.test(rest)) {
      subtitle = rest.replace(/\s*:$/, '')
      rest = ''
    }

    const fullText = [rest, bodyText].filter(Boolean).join(' ').trim()

    const attackMatch = fullText.match(/([+-]\d+)\s*к попаданию/i)
    const rangeMatch = fullText.match(/(?:досягаемость|дистанция)\s*(\d+)\s*(?:футов|фт)/i)
    const targetMatch = fullText.match(/(одна цель|одно существо)/i)
    const saveMatch = fullText.match(
      /спасброск[а-яё]*\s+(силы|ловкости|телосложения|интеллекта|мудрости|харизмы)\s+сл\s+(\d+)/i,
    )

    const damage = extractDamage(fullText)

    // Из описания убираем уже структурированные служебные фразы атаки и попадания.
    let description = fullText
      .replace(/^\s*[+-]\d+\s*к попаданию[^.]*\.\s*/i, '')
      .replace(/попадание\s*:?\s*[^.]*урон[^.]*\.\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    // Пустое описание допустимо, если суть абзаца ушла в структурированные поля.
    if (!description && !attackMatch && !damage?.length) description = fullText

    entries.push({
      id: `${sectionId}-feature-${entries.length + 1}`,
      name,
      subtitle,
      usage,
      attackBonus: attackMatch ? Number(attackMatch[1]) : undefined,
      range: rangeMatch ? `${rangeMatch[1]} фт.` : undefined,
      target: targetMatch
        ? targetMatch[1].toLocaleLowerCase('ru-RU') === 'одна цель'
          ? '1 цель'
          : '1 существо'
        : undefined,
      save: saveMatch
        ? { ability: resolveAbilityKey(saveMatch[1]) ?? 'strength', dc: Number(saveMatch[2]) }
        : undefined,
      damage,
      description,
    })
  }

  return {
    entries,
    introduction: introductionParts.join(' ').trim() || undefined,
  }
}
