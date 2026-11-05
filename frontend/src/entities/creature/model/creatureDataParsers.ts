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
const USAGE_PATTERN = /\((перезаряд(?:ка|[а-яё]*)[^)]*|перезаряж[а-яё]*[^)]*|восстанавливается[^)]*|\d+\s*\/\s*день[^)]*|стоит[^)]*)\)/i

// Датасет использует разные порядки слов и падежи: «дробящий урон 4»,
// «4 дробящего урона», «4 (1к6 + 1) урона огнём». Типы других блоков не меняем.
const damageGenitiveAliases: readonly (readonly [string, DamageType])[] = [
  ['дробящего', 'bludgeoning'],
  ['колющего', 'piercing'],
  ['рубящего', 'slashing'],
  ['кислотного', 'acid'],
  ['огненного', 'fire'],
  ['некротического', 'necrotic'],
  ['психического', 'psychic'],
  ['электрического', 'lightning'],
  ['звукового', 'thunder'],
]

const featureDamageAliases = [
  ...damageTypeAliases,
  ...damageTypeInstrumentalAliases,
  ...damageGenitiveAliases,
]
const damageTypePattern = featureDamageAliases
  .map(([name]) => name)
  .sort((a, b) => b.length - a.length)
  .join('|')
const damageAmountPattern = '(?<average>\\d+)(?:\\s*\\(\\s*(?<formula>\\d+\\s*[dк]\\s*\\d+(?:\\s*[+−-]\\s*(?:\\d+\\s*[dк]\\s*)?\\d+)*)\\s*\\))?'
const featureDamagePatterns = [
  new RegExp(`(?<type>${damageTypePattern})\\s+урон(?:а)?\\s*:?\\s*${damageAmountPattern}`, 'gi'),
  new RegExp(`урон(?:а)?\\s+(?<type>${damageTypePattern})\\s*:?\\s*${damageAmountPattern}`, 'gi'),
  new RegExp(`${damageAmountPattern}\\s+(?<type>${damageTypePattern})\\s+урон(?:а)?`, 'gi'),
  new RegExp(`${damageAmountPattern}\\s+урон(?:а)?\\s+(?<type>${damageTypePattern})(?![а-яё])`, 'gi'),
]

function normalizeFormula(formula: string): string {
  return formula.replace(/−/g, '-').replace(/\s+/g, ' ').trim()
}

function findDamageType(name: string): DamageType | undefined {
  const lowered = name.toLocaleLowerCase('ru-RU')
  return featureDamageAliases.find(([alias]) => alias === lowered)?.[1]
}

function extractDamage(text: string): CreatureFeature['damage'] {
  const found: {
    index: number
    end: number
    type: DamageType
    average: number
    formula?: string
  }[] = []

  for (const pattern of featureDamagePatterns) {
    for (const match of text.matchAll(pattern)) {
      const type = match.groups?.type && findDamageType(match.groups.type)
      if (!type || !match.groups) continue

      const index = match.index ?? 0
      const end = index + match[0].length
      // Разные порядки слов могут совпасть в одной фразе; не дублируем урон.
      if (found.some((entry) => index < entry.end && end > entry.index)) continue

      found.push({
        index,
        end,
        type,
        average: Number(match.groups.average),
        formula: match.groups.formula ? normalizeFormula(match.groups.formula) : undefined,
      })
    }
  }

  found.sort((a, b) => a.index - b.index)
  return found.length > 0
    ? found.map(({ type, average, formula }) => ({ type, average, formula }))
    : undefined
}

const paragraphText = (element: Element): string => {
  const copy = element.cloneNode(true) as Element
  copy.querySelectorAll('br').forEach((node) => node.replaceWith(' '))
  copy.querySelectorAll('p, li, td, th, div').forEach((node) => node.append(' '))
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

type ParsedFeatureBlock = {
  entries: CreatureFeature[]
  introduction?: string
  introductionHtml?: string
}

// Выделенные жирным/курсивом частоты заклинаний и подписи внутри действия —
// продолжение способности, а не названия новых особенностей.
const CONTINUATION_HEADING_PATTERN = /^(?:неограниченно|по желанию|постоянно|заговоры|(?:по\s+)?\d+\s*(?:раз[а-яё]*\s*)?(?:\/\s*|в\s+)(?:день|сутки|неделю)|\d+(?:\s*[-–—]\s*\d+)?\s*[-–—]?\s*(?:й|го)?\s*уров(?:ень|ня)|попадание|промах|при попадании|при успехе|при провале)(?:[\s:(.：]|$)/i
const FEATURE_HEADING_TAGS = new Set(['EM', 'STRONG', 'B', 'I'])
const FEATURE_BLOCK_TAGS = new Set(['P', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE'])

function featureHeading(paragraph: Element): Element | undefined {
  if (paragraph.tagName !== 'P') return undefined
  const candidate = paragraph.firstElementChild
  if (!candidate || !FEATURE_HEADING_TAGS.has(candidate.tagName)) return undefined

  const precededOnlyByWhitespace = Array.from(paragraph.childNodes)
    .slice(0, Array.prototype.indexOf.call(paragraph.childNodes, candidate))
    .every((node) => node.nodeType === 3 && !(node.textContent ?? '').trim())
  if (!precededOnlyByWhitespace || candidate.querySelector('a, img, table')) return undefined

  const text = paragraphText(candidate)
  if (!text || CONTINUATION_HEADING_PATTERN.test(text) || ATTACK_SUBTITLE_PATTERN.test(text)) {
    return undefined
  }

  // Длинное ограничение использования не должно превращать «Лидерство»
  // в продолжение предыдущей атаки. Обычный длинный курсив остаётся текстом.
  const titleWithoutUsage = text.replace(USAGE_PATTERN, '').trim()
  return titleWithoutUsage.length <= 90 ? candidate : undefined
}

function removeTitleDelimiter(paragraph: Element): void {
  const walker = paragraph.ownerDocument.createTreeWalker(paragraph, 4)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = node.textContent ?? ''
    node.textContent = text.replace(/^[\s.:]+/, '')
    if ((node.textContent ?? '').trim()) break
  }
}

/** Вычисляет показатели действия из полного текста правил. */
export function parseCreatureFeatureDetails(text: string): Pick<CreatureFeature,
  'attackBonus' | 'range' | 'target' | 'save' | 'damage'
> {
  const attackMatch = text.match(/([+-]\d+)\s*к попаданию/i)
  const ranges = Array.from(text.matchAll(
    /(?:досягаемость|дистанция)\s*(\d+(?:\s*[/–-]\s*\d+)?)\s*(?:футов|фт)/gi,
  )).map((match) => `${match[1].replace(/\s+/g, '')} фт.`)
  const targetMatch = text.match(/одн[аоу]\s+цел[ьи]|одн[оау]\s+существ[оа]/i)
  const saveMatch = text.match(
    /спасброс[а-яё]*\s+(силы|ловкости|телосложения|интеллекта|мудрости|харизмы)\s+сл\s+(\d+)/i,
  )

  return {
    attackBonus: attackMatch ? Number(attackMatch[1]) : undefined,
    range: ranges.length ? ranges.join(' / ') : undefined,
    target: targetMatch ? /цел/i.test(targetMatch[0]) ? '1 цель' : '1 существо' : undefined,
    save: saveMatch
      ? { ability: resolveAbilityKey(saveMatch[1]) ?? 'strength', dc: Number(saveMatch[2]) }
      : undefined,
    damage: extractDamage(text),
  }
}

/**
 * Разбирает именованные абзацы *_html, присоединяя последующие списки/таблицы
 * к той же особенности. Исходная разметка и полный текст правил сохраняются:
 * извлечение показателей никогда не удаляет нераспознанное условие или эффект.
 * Неизвестная структура возвращает undefined — секция выводится исходным HTML.
 */
export function parseFeatureHtml(
  html: string,
  sectionId: string,
): ParsedFeatureBlock | undefined {
  if (typeof DOMParser === 'undefined') return undefined

  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (Array.from(doc.body.childNodes).some(
    (node) => node.nodeType === 3 && (node.textContent ?? '').trim(),
  )) return undefined
  // Типичная обёртка датасета — единственный <div> с абзацами внутри.
  const wrapper =
    doc.body.children.length === 1 && doc.body.children[0].tagName === 'DIV'
      ? doc.body.children[0]
      : doc.body
  // Не игнорируем отдельные текстовые узлы: иначе импорт может молча терять текст.
  if (Array.from(wrapper.childNodes).some(
    (node) => node.nodeType === 3 && (node.textContent ?? '').trim(),
  )) return undefined

  const blocks = Array.from(wrapper.children).filter((child) => child.tagName !== 'BR')
  if (blocks.length === 0) return undefined
  if (blocks.some((child) => !FEATURE_BLOCK_TAGS.has(child.tagName))) return undefined

  const entries: CreatureFeature[] = []
  const introductionParts: string[] = []
  const introductionHtml: string[] = []

  for (const block of blocks) {
    const paragraph = block.cloneNode(true) as Element
    const candidate = featureHeading(paragraph)
    const headerText = candidate ? paragraphText(candidate) : ''

    if (!headerText) {
      const bodyText = paragraphText(paragraph)
      // Блок без имени: вступление секции или продолжение предыдущей feature.
      if (entries.length === 0) {
        if (bodyText) introductionParts.push(bodyText)
        introductionHtml.push(paragraph.outerHTML)
      } else {
        const previous = entries[entries.length - 1]
        const description = [previous.description, bodyText].filter(Boolean).join('\n\n')
        entries[entries.length - 1] = {
          ...previous,
          ...parseCreatureFeatureDetails(description),
          description,
          descriptionHtml: `${previous.descriptionHtml ?? ''}${paragraph.outerHTML}`,
        }
      }
      continue
    }

    candidate?.remove()
    removeTitleDelimiter(paragraph)
    // Ограничение использования отделяем до разбора подзаголовка атаки.
    const usageMatch = headerText.match(USAGE_PATTERN)
    const usage = usageMatch?.[1]?.trim()
    const title = headerText.replace(USAGE_PATTERN, '').replace(/\s+\./g, '.').trim()
    const nameMatch = title.match(/^(.*?\.)\s+(.*)$/s)
    const name = (nameMatch ? nameMatch[1] : title).trim()
    let rest = (nameMatch ? nameMatch[2] : '').trim()

    let subtitle: string | undefined
    if (rest && ATTACK_SUBTITLE_PATTERN.test(rest)) {
      subtitle = rest.replace(/\s*:$/, '')
      rest = ''
    }

    // Иногда тип атаки — отдельный курсив сразу после названия.
    const bodySubtitle = paragraph.firstElementChild
    if (!rest && bodySubtitle && FEATURE_HEADING_TAGS.has(bodySubtitle.tagName) &&
      ATTACK_SUBTITLE_PATTERN.test(paragraphText(bodySubtitle)) &&
      Array.from(paragraph.childNodes)
        .slice(0, Array.prototype.indexOf.call(paragraph.childNodes, bodySubtitle))
        .every((node) => node.nodeType === 3 && !(node.textContent ?? '').trim())) {
      subtitle = paragraphText(bodySubtitle).replace(/\s*:$/, '')
      bodySubtitle.remove()
      removeTitleDelimiter(paragraph)
    }
    if (rest) paragraph.prepend(`${rest} `)

    const bodyText = paragraphText(paragraph)

    entries.push({
      id: `${sectionId}-feature-${entries.length + 1}`,
      name,
      subtitle,
      usage,
      ...parseCreatureFeatureDetails(bodyText),
      description: bodyText,
      descriptionHtml: paragraph.innerHTML.trim() ? paragraph.outerHTML : undefined,
    })
  }

  return {
    entries,
    introduction: introductionParts.join('\n\n').trim() || undefined,
    introductionHtml: introductionHtml.join('') || undefined,
  }
}
