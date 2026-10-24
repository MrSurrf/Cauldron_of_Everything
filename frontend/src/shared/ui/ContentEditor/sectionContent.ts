import type { ContentBlock } from './contentCodec'

export type SectionBlock = Extract<ContentBlock, { kind: 'collapsible' }>
export type ContentSectionValue = { title: string; tag: string; color: string; body: string }

export const sectionColors = [
  { id: 'default', label: 'По умолчанию', value: 'var(--palette-purple-300)' },
  { id: 'gray', label: 'Серый', value: 'var(--palette-gray-300)' },
  { id: 'purple', label: 'Фиолетовый', value: 'var(--palette-purple-500)' },
  { id: 'gold', label: 'Золотой', value: 'var(--palette-yellow-500)' },
  { id: 'green', label: 'Зелёный', value: 'var(--palette-green-500)' },
  { id: 'red', label: 'Красный', value: 'var(--palette-red-500)' },
] as const

export const emptySection: ContentSectionValue = { title: '', tag: '', color: 'default', body: '' }

export function decodeAttribute(value: string) {
  try { return decodeURIComponent(value) } catch { return value }
}

export function directiveBody(source: string) {
  return source.slice(source.indexOf('\n') + 1, source.lastIndexOf('\n'))
}

export function sectionFromBlock(block: SectionBlock): ContentSectionValue {
  return {
    title: block.attributes.name !== undefined ? decodeAttribute(block.attributes.name) : block.title,
    tag: decodeAttribute(block.attributes.tag ?? ''),
    color: sectionColors.some(color => color.id === block.attributes.color) ? block.attributes.color : 'default',
    body: directiveBody(block.rawSource),
  }
}

export function sectionToSource(value: ContentSectionValue, attributes: Readonly<Record<string, string>> = {}) {
  const attrs = { ...attributes, name: encodeURIComponent(value.title), tag: encodeURIComponent(value.tag), color: value.color }
  const header = Object.entries(attrs).map(([key, text]) => `${key}="${text.replace(/"/g, '%22')}"`).join(' ')
  return `:::collapsible[${value.title.replace(/[\]\r\n]/g, ' ')}]{${header}}\n${value.body}\n:::`
}
