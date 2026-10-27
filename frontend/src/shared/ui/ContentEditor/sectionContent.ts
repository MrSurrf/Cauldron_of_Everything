import type { ContentBlock } from './contentCodec'
import type {
  ContentSectionVisibility,
  ContentViewerAudience,
} from './ContentEditor.types'

export type SectionBlock = Extract<ContentBlock, { kind: 'collapsible' }>
export type ContentSectionValue = {
  body: string
  color: string
  defaultOpen: boolean
  tag: string
  title: string
  visibility: ContentSectionVisibility
}

export const sectionColors = [
  { id: 'default', label: 'По умолчанию', value: 'var(--palette-purple-300)' },
  { id: 'gray', label: 'Серый', value: 'var(--palette-gray-300)' },
  { id: 'purple', label: 'Фиолетовый', value: 'var(--palette-purple-500)' },
  { id: 'gold', label: 'Золотой', value: 'var(--palette-yellow-500)' },
  { id: 'green', label: 'Зелёный', value: 'var(--palette-green-500)' },
  { id: 'red', label: 'Красный', value: 'var(--palette-red-500)' },
] as const

export const sectionVisibilityOptions = [
  { label: 'Наследовать', value: 'inherit' },
  { label: 'Только мастер', value: 'master' },
  { label: 'Игроки и мастер', value: 'players' },
  { label: 'Публично', value: 'public' },
] as const satisfies ReadonlyArray<{
  label: string
  value: ContentSectionVisibility
}>

export const emptySection: ContentSectionValue = {
  body: '',
  color: 'default',
  defaultOpen: false,
  tag: '',
  title: '',
  visibility: 'inherit',
}

export function decodeAttribute(value: string) {
  try { return decodeURIComponent(value) } catch { return value }
}

export function directiveBody(source: string) {
  return source.slice(source.indexOf('\n') + 1, source.lastIndexOf('\n'))
}

function booleanAttribute(value: string | undefined) {
  return value !== undefined && /^(?:1|true|yes|open)$/i.test(value.trim())
}

function sectionVisibility(value: string | undefined): ContentSectionVisibility {
  return sectionVisibilityOptions.some(option => option.value === value)
    ? value as ContentSectionVisibility
    : 'inherit'
}

export function resolveSectionVisibility(
  visibility: ContentSectionVisibility,
  inheritedVisibility: ContentViewerAudience = 'public',
): ContentViewerAudience {
  return visibility === 'inherit' ? inheritedVisibility : visibility
}

export function isSectionVisibleTo(
  visibility: ContentSectionVisibility,
  viewerAudience: ContentViewerAudience,
  inheritedVisibility: ContentViewerAudience = 'public',
) {
  const resolved = resolveSectionVisibility(
    visibility,
    inheritedVisibility,
  )

  if (viewerAudience === 'master') return true
  if (viewerAudience === 'players') return resolved !== 'master'
  return resolved === 'public'
}

export function sectionFromBlock(block: SectionBlock): ContentSectionValue {
  return {
    body: directiveBody(block.rawSource),
    color: sectionColors.some(color => color.id === block.attributes.color) ? block.attributes.color : 'default',
    defaultOpen: booleanAttribute(
      block.attributes.open ??
      block.attributes['default-open'] ??
      block.attributes.defaultopen,
    ),
    title: block.attributes.name !== undefined ? decodeAttribute(block.attributes.name) : block.title,
    tag: decodeAttribute(block.attributes.tag ?? ''),
    visibility: sectionVisibility(block.attributes.visibility),
  }
}

export function sectionToSource(value: ContentSectionValue, attributes: Readonly<Record<string, string>> = {}) {
  const attrs: Record<string, string> = {
    ...attributes,
    name: encodeURIComponent(value.title),
    tag: encodeURIComponent(value.tag),
    color: value.color,
  }

  delete attrs['default-open']
  delete attrs.defaultopen

  if (value.defaultOpen) attrs.open = 'true'
  else delete attrs.open

  if (value.visibility === 'inherit') delete attrs.visibility
  else attrs.visibility = value.visibility

  const header = Object.entries(attrs).map(([key, text]) => `${key}="${text.replace(/"/g, '%22')}"`).join(' ')
  return `:::collapsible[${value.title.replace(/[\]\r\n]/g, ' ')}]{${header}}\n${value.body}\n:::`
}
