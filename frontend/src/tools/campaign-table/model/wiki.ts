export type WikiVisibility = 'master' | 'players' | 'public'

export type WikiCustomProperty = {
  id: string
  label: string
  value: string
}

export type WikiSection = {
  id: string
  title: string
  content: string
  visibility: WikiVisibility
  collapsedByDefault: boolean
}

/**
 * Ссылки на бинарные данные, сохранённые отдельно от документа кампании.
 * Сам файл (и временный object URL) в JSON стола не попадает.
 */
export type WikiMediaReferences = {
  coverAssetId?: string
  avatarAssetId?: string
}

export type EntityWiki = {
  aliases: string[]
  status: string
  tags: string[]
  world: string
  customProperties: WikiCustomProperty[]
  sections: WikiSection[]
  media: WikiMediaReferences
}

/** Возвращает новый независимый набор wiki-полей для Entity. */
export function createWikiDefaults(): EntityWiki {
  return {
    aliases: [],
    status: '',
    tags: [],
    world: '',
    customProperties: [],
    sections: [],
    media: {},
  }
}

/** Не изменяет исходный wiki-документ и копирует все переданные коллекции. */
export function updateWiki(wiki: EntityWiki, changes: Partial<EntityWiki>): EntityWiki {
  return {
    aliases: [...(changes.aliases ?? wiki.aliases)],
    status: changes.status ?? wiki.status,
    tags: [...(changes.tags ?? wiki.tags)],
    world: changes.world ?? wiki.world,
    customProperties: (changes.customProperties ?? wiki.customProperties).map(property => ({ ...property })),
    sections: (changes.sections ?? wiki.sections).map(section => ({ ...section })),
    media: { ...(changes.media ?? wiki.media) },
  }
}

export function updateWikiProperty(
  wiki: EntityWiki,
  id: string,
  changes: Partial<Omit<WikiCustomProperty, 'id'>>,
): EntityWiki {
  if (!wiki.customProperties.some(property => property.id === id)) return wiki
  return updateWiki(wiki, { customProperties: wiki.customProperties.map(property => (
    property.id === id ? { ...property, ...changes } : property
  )) })
}

export function updateWikiSection(
  wiki: EntityWiki,
  id: string,
  changes: Partial<Omit<WikiSection, 'id'>>,
): EntityWiki {
  if (!wiki.sections.some(section => section.id === id)) return wiki
  return updateWiki(wiki, { sections: wiki.sections.map(section => (
    section.id === id ? { ...section, ...changes } : section
  )) })
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const uniqueIds = (values: Array<{ id: string }>) => new Set(values.map(value => value.id)).size === values.length

export function validWiki(value: unknown): value is EntityWiki {
  if (!record(value) || !Array.isArray(value.aliases) || !value.aliases.every(text)
    || !text(value.status) || !Array.isArray(value.tags) || !value.tags.every(text)
    || !text(value.world) || !Array.isArray(value.customProperties) || !Array.isArray(value.sections)
    || !record(value.media)) return false

  const customProperties = value.customProperties as unknown[]
  if (!customProperties.every(property => record(property) && text(property.id) && Boolean(property.id)
    && text(property.label) && text(property.value))
    || !uniqueIds(customProperties as WikiCustomProperty[])) return false

  const sections = value.sections as unknown[]
  if (!sections.every(section => record(section) && text(section.id) && Boolean(section.id)
    && text(section.title) && text(section.content)
    && ['master', 'players', 'public'].includes(String(section.visibility))
    && typeof section.collapsedByDefault === 'boolean')
    || !uniqueIds(sections as WikiSection[])) return false

  return (value.media.coverAssetId === undefined || (text(value.media.coverAssetId) && Boolean(value.media.coverAssetId)))
    && (value.media.avatarAssetId === undefined || (text(value.media.avatarAssetId) && Boolean(value.media.avatarAssetId)))
}
