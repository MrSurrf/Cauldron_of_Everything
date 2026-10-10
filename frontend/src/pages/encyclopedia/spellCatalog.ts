import { fetchEncyclopedia } from './encyclopediaApi'

type JsonRecord = Record<string, unknown>

export type SpellSummary = {
  id: number
  entity_type: string
  name: string
  name_en?: string
  slug: string
  sources?: unknown
  summary?: JsonRecord
}

export type CatalogSpell = {
  id: number
  name: string
  nameEn: string
  level: string
  school: string
  classes: string[]
  subclasses: string[]
  sources: string[]
  concentration: string
  ritual: string
  components: string[]
  castingTime: string
  damageTypes: string[]
  homebrew: boolean
}

type SpellPage = { count: number; results: SpellSummary[] }
const PAGE_SIZE = 100

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const item = record(value)
  return text(item.name ?? item.title ?? item.label ?? item.source ?? item.book ?? item.value)
}

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(values)
  if (typeof value === 'string') return value.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)
  const item = text(value)
  return item ? [item] : []
}

function booleanLabel(value: unknown): string {
  if (value === true || /^(true|yes|да|1)$/i.test(text(value))) return 'Да'
  if (value === false || /^(false|no|нет|0)$/i.test(text(value))) return 'Нет'
  return ''
}

function componentValues(value: unknown): string[] {
  const componentNames = [
    ['Вербальный', /(?:^|[^a-zа-я])(?:в|v)(?:$|[^a-zа-я])|вербал|verbal/i],
    ['Соматический', /(?:^|[^a-zа-я])(?:с|s)(?:$|[^a-zа-я])|сомат|somatic/i],
    ['Материальный', /(?:^|[^a-zа-я])(?:м|m)(?:$|[^a-zа-я])|материал|material/i],
  ] as const
  const source = typeof value === 'string' ? value : values(value).join(', ')
  const componentFlags = record(value)
  return componentNames.filter(([name, pattern]) =>
    pattern.test(source) || ({ Вербальный: componentFlags.verbal ?? componentFlags.v,
      Соматический: componentFlags.somatic ?? componentFlags.s,
      Материальный: componentFlags.material ?? componentFlags.m }[name] === true),
  ).map(([name]) => name)
}

export function toCatalogSpell(item: SpellSummary): CatalogSpell {
  const data = record(item.summary)
  const sources = values(item.sources)
  const concentration = booleanLabel(data.concentration)
    || (/концентрац|concentration/i.test(text(data.duration)) ? 'Да' : '')
  return {
    id: item.id,
    name: item.name,
    nameEn: item.name_en ?? '',
    level: text(data.level),
    school: text(data.school),
    classes: values(data.classes ?? data.class),
    subclasses: values(data.subclasses ?? data.subclass),
    sources,
    concentration,
    ritual: booleanLabel(data.ritual),
    components: componentValues(data.components),
    castingTime: text(data.casting_time ?? data.cast_time ?? data.time),
    damageTypes: values(data.damage_types ?? data.damage_type ?? data.damage),
    homebrew: data.is_homebrew === true
      || sources.some((source) => /homebrew|хоумбрю|домашн/i.test(source)),
  }
}

export async function loadSpells(signal: AbortSignal): Promise<CatalogSpell[]> {
  const params = new URLSearchParams({ type: 'spell', page_size: String(PAGE_SIZE) })
  const first = await fetchEncyclopedia<SpellPage>(`?${params}`, signal)
  const pages = await Promise.all(Array.from({ length: Math.ceil(first.count / PAGE_SIZE) - 1 }, (_, index) =>
    fetchEncyclopedia<SpellPage>(`?${params}&page=${index + 2}`, signal),
  ))
  return [first, ...pages].flatMap((page) => page.results)
    .filter((item) => item.entity_type === 'spell')
    .map(toCatalogSpell)
}
