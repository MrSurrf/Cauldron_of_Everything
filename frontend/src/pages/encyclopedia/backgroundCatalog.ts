import { fetchEncyclopedia } from './encyclopediaApi'
import type { EncyclopediaEntry } from './encyclopediaApi'

export type CatalogBackground = EncyclopediaEntry & {
  sources: string[]
  skills: string[]
  homebrew: boolean
}

type BackgroundSummary = EncyclopediaEntry & {
  sources?: unknown
  summary?: { skill_proficiencies?: unknown; is_homebrew?: boolean }
}
type BackgroundPage = { count: number; results: BackgroundSummary[] }

function labels(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap(labels))]
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return labels(item.name ?? item.title ?? item.label ?? item.source ?? item.book)
  }
  return []
}

export function toCatalogBackground(entry: BackgroundSummary): CatalogBackground {
  const sources = labels(entry.sources)
  return {
    ...entry,
    sources,
    skills: labels(entry.summary?.skill_proficiencies).flatMap(value => value.split(/[,;]+/).map(skill => skill.trim()).filter(Boolean)),
    homebrew: entry.summary?.is_homebrew === true || sources.some(source => /homebrew|хоумбрю|домашн/i.test(source)),
  }
}

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true })
const missingSource = 'Источник не указан'
const isHandbook = (source: string) => /^(phb|player[’']?s handbook|книга игрока)(?:\s|$)/i.test(source)

export function groupBackgroundsBySource(entries: CatalogBackground[]) {
  const groups = new Map<string, CatalogBackground[]>()
  for (const entry of entries) {
    for (const source of entry.sources.length ? [...new Set(entry.sources)] : [missingSource]) {
      const group = groups.get(source) ?? []
      group.push(entry)
      groups.set(source, group)
    }
  }
  return [...groups].sort(([a], [b]) =>
    Number(a === missingSource) - Number(b === missingSource)
    || Number(isHandbook(b)) - Number(isHandbook(a))
    || collator.compare(a.replace(/^the\s+/i, ''), b.replace(/^the\s+/i, '')),
  ).map(([source, items]) => ({ source, entries: [...items].sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id) }))
}

export async function loadBackgrounds(signal: AbortSignal): Promise<CatalogBackground[]> {
  const params = new URLSearchParams({ type: 'background', page_size: '100' })
  const first = await fetchEncyclopedia<BackgroundPage>(`?${params}`, signal)
  const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.count / 100) - 1) }, (_, index) =>
    fetchEncyclopedia<BackgroundPage>(`?${params}&page=${index + 2}`, signal),
  ))
  return [first, ...pages].flatMap(page => page.results).filter(entry => entry.entity_type === 'background').map(toCatalogBackground)
}
