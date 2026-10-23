import type { ProfileData, ProfilePayload, ProfilePrivacy, ProfileVisibility } from '../../shared/api/account'

export type { ProfileData } from '../../shared/api/account'

export const gameSystems = ['Dungeons & Dragons 5e', 'Pathfinder 2e', 'Call of Cthulhu', 'Vampire: The Masquerade', 'Blades in the Dark']
export const playStyles = ['Ролевая игра и отыгрыш', 'Политика и интриги', 'Глубокий лор и мир', 'Тактические сражения', 'Исследование и загадки', 'Юмор и лёгкий тон']
export const genres = ['Тёмное фэнтези', 'Готика', 'Ужасы', 'Мистика', 'Исследования', 'Древние цивилизации']
export const themes = [
  { value: 'purple', label: 'Аметист', color: 'var(--palette-purple-400)' },
  { value: 'blue', label: 'Сапфир', color: 'var(--palette-blue-400)' },
  { value: 'green', label: 'Изумруд', color: 'var(--palette-green-500)' },
  { value: 'gold', label: 'Янтарь', color: 'var(--palette-yellow-500)' },
] as const
export const visibilityOptions = [
  { value: 'all', label: 'Все пользователи' },
  { value: 'friends', label: 'Только друзья' },
  { value: 'none', label: 'Только я' },
]
export const privacyFields = [
  { key: 'online', label: 'Показывать статус «Онлайн»' },
  { key: 'activity', label: 'Показывать активность' },
  { key: 'articles', label: 'Показывать статьи' },
  { key: 'characters', label: 'Показывать чарлисты' },
  { key: 'followers', label: 'Показывать количество подписчиков' },
  { key: 'city', label: 'Показывать город' },
] as const

export const emptyProfile: ProfileData = {
  name: '',
  tagline: '',
  city: '',
  title: '',
  role: '',
  bio: '',
  quote: '',
  portrait: null,
  theme: 'purple',
  systems: [],
  styles: [],
  genres: [],
  links: [],
  visibility: 'all',
  messages: 'all',
  privacy: { online: true, activity: true, articles: true, characters: true, followers: true, city: true },
}

const visibilityValues: ProfileVisibility[] = ['all', 'friends', 'none']

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function stringList(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
    ? [...value]
    : [...fallback]
}

function visibilityValue(value: unknown, fallback: ProfileVisibility): ProfileVisibility {
  return typeof value === 'string' && visibilityValues.includes(value as ProfileVisibility)
    ? value as ProfileVisibility
    : fallback
}

export function cloneProfile(profile: ProfileData): ProfileData {
  return {
    ...profile,
    systems: [...profile.systems],
    styles: [...profile.styles],
    genres: [...profile.genres],
    links: profile.links.map(link => ({ ...link })),
    privacy: { ...profile.privacy },
  }
}

export function normalizeProfile(value: unknown, fallback: ProfileData = emptyProfile): ProfileData {
  const source: ProfilePayload = isObject(value) ? value : {}
  const sourcePrivacy: Record<string, unknown> = isObject(source.privacy) ? source.privacy : {}
  const privacy = Object.fromEntries(
    privacyFields.map(({ key }) => [
      key,
      typeof sourcePrivacy[key] === 'boolean' ? sourcePrivacy[key] : fallback.privacy[key],
    ]),
  ) as ProfilePrivacy
  const links = Array.isArray(source.links)
    ? source.links.flatMap(link => isObject(link) && typeof link.label === 'string' && typeof link.value === 'string'
      ? [{ label: link.label, value: link.value }]
      : [])
    : fallback.links.map(link => ({ ...link }))

  return {
    name: stringValue(source.name, fallback.name),
    tagline: stringValue(source.tagline, fallback.tagline),
    city: stringValue(source.city, fallback.city),
    title: stringValue(source.title, fallback.title),
    role: stringValue(source.role, fallback.role),
    bio: stringValue(source.bio, fallback.bio),
    quote: stringValue(source.quote, fallback.quote),
    portrait: typeof source.portrait === 'string' || source.portrait === null ? source.portrait : fallback.portrait,
    theme: typeof source.theme === 'string' && themes.some(theme => theme.value === source.theme) ? source.theme : fallback.theme,
    systems: stringList(source.systems, fallback.systems),
    styles: stringList(source.styles, fallback.styles),
    genres: stringList(source.genres, fallback.genres),
    links,
    visibility: visibilityValue(source.visibility, fallback.visibility),
    messages: visibilityValue(source.messages, fallback.messages),
    privacy,
  }
}
