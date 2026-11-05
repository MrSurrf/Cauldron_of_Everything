import { fetchEncyclopedia } from './encyclopediaApi'
import type { EncyclopediaEntry } from './encyclopediaApi'

export type ClassCollection = 'base' | 'expanded'

export type CatalogClass = EncyclopediaEntry & {
  sources: string[]
  hitDie: string
  roles: string[]
  description: string
  collection: ClassCollection
  homebrew: boolean
}

type ClassSummary = EncyclopediaEntry & {
  sources?: unknown
  summary?: Record<string, unknown> & { hit_die?: unknown; is_homebrew?: unknown }
}

type ClassPage = { count: number; results: ClassSummary[] }

type ClassProfile = {
  keys: string[]
  roles: string[]
  description: string
  collection?: ClassCollection
}

const profiles: ClassProfile[] = [
  { keys: ['бард', 'bard'], roles: ['Поддержка', 'Контроль'], description: 'Мастер вдохновения, музыки и слова. Поддерживает союзников и меняет ход событий.' },
  { keys: ['варвар', 'barbarian'], roles: ['Защита', 'Урон'], description: 'Неудержимая сила и ярость. Выживает там, где другие не могут.' },
  { keys: ['воин', 'fighter'], roles: ['Урон', 'Защита'], description: 'Мастер оружия и тактики. Надёжная защита и смертоносные атаки.' },
  { keys: ['волшебник', 'wizard'], roles: ['Контроль', 'Урон'], description: 'Глубокие знания и могущественная магия. Изучает тайны мира и меняет реальность.' },
  { keys: ['друид', 'druid'], roles: ['Контроль', 'Поддержка'], description: 'Единство с природой, дикая форма и магия стихий. Защищает баланс мира.' },
  { keys: ['жрец', 'cleric'], roles: ['Поддержка', 'Исцеление'], description: 'Служит богам, исцеляет раны и поддерживает союзников священной магией.' },
  { keys: ['изобретатель', 'artificer'], roles: ['Поддержка', 'Контроль'], description: 'Сочетает магию и технологию. Создаёт устройства, упрощающие жизнь и игру.', collection: 'expanded' },
  { keys: ['колдун', 'warlock'], roles: ['Урон', 'Контроль'], description: 'Черпает силу из иных источников. Заключает сделки и использует запретную магию.' },
  { keys: ['монах', 'monk'], roles: ['Урон', 'Мобильность'], description: 'Дисциплина тела и разума. Преодолевает любые преграды в совершенствовании.' },
  { keys: ['паладин', 'paladin'], roles: ['Защита', 'Поддержка'], description: 'Несёт клятвы и защищает невинных. Сочетает боевое мастерство и священную магию.' },
  { keys: ['плут', 'rogue'], roles: ['Урон', 'Эксперт'], description: 'Скрытность, ловкость и хитрость. Находит решения там, где другие видят тупик.' },
  { keys: ['следопыт', 'ranger'], roles: ['Урон', 'Исследование'], description: 'Следует за следами, охраняет природу и мастерски владеет дальним боем.' },
  { keys: ['чародей', 'sorcerer'], roles: ['Урон', 'Контроль'], description: 'Врождённая магия течёт в его крови. Интуитивно управляет неподвластной другим силой.' },
]

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true })

function labels(value: unknown): string[] {
  if (Array.isArray(value)) return [...new Set(value.flatMap(labels))]
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return labels(item.name ?? item.title ?? item.label ?? item.source ?? item.book)
  }
  return []
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  return ''
}

function classProfile(entry: ClassSummary): ClassProfile | undefined {
  const search = `${entry.name} ${entry.name_en ?? ''}`.toLocaleLowerCase('ru-RU')
  return profiles.find(profile => profile.keys.some(key => search.includes(key)))
}

export function toCatalogClass(entry: ClassSummary): CatalogClass {
  const sources = labels(entry.sources)
  const profile = classProfile(entry)
  const homebrew = entry.summary?.is_homebrew === true
    || sources.some(source => /homebrew|хоумбрю|домашн/i.test(source))
  const handbook = sources.some(source => /\bphb\b|player[’']?s handbook|книга игрока/i.test(source))

  return {
    ...entry,
    sources,
    hitDie: text(entry.summary?.hit_die),
    roles: profile?.roles ?? ['Универсальный'],
    description: profile?.description ?? 'Класс персонажа со своим стилем игры, развитием и уникальными особенностями.',
    collection: profile?.collection ?? (handbook || profile ? 'base' : 'expanded'),
    homebrew,
  }
}

export async function loadClasses(signal: AbortSignal): Promise<CatalogClass[]> {
  const params = new URLSearchParams({ type: 'class', page_size: '100' })
  const first = await fetchEncyclopedia<ClassPage>(`?${params}`, signal)
  const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.count / 100) - 1) }, (_, index) =>
    fetchEncyclopedia<ClassPage>(`?${params}&page=${index + 2}`, signal),
  ))

  return [first, ...pages]
    .flatMap(page => page.results)
    .filter(entry => entry.entity_type === 'class')
    .map(toCatalogClass)
    .sort((left, right) => collator.compare(left.name, right.name) || left.id - right.id)
}

export function filterClasses(entries: readonly CatalogClass[], filters: {
  collection: 'all' | ClassCollection
  role: string | null
  source: string | null
}) {
  return entries.filter(entry =>
    (filters.collection === 'all' || entry.collection === filters.collection)
    && (!filters.role || entry.roles.includes(filters.role))
    && (!filters.source || entry.sources.includes(filters.source)),
  )
}
