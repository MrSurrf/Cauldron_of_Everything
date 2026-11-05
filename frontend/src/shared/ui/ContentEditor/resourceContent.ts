import type { ContentBlock } from './contentCodec'
import type { ContentResourceValue } from './ResourceWidget'

export type ResourceBlock = Extract<ContentBlock, { kind: 'resource' }>

export const emptyResource: ContentResourceValue = {
  title: '', current: null, maximum: '', recovery: 'none', notes: '', showNotes: false,
}

function decode(value: string) {
  try { return decodeURIComponent(value) } catch { return value }
}

export function resourceFromBlock(block: ResourceBlock): ContentResourceValue {
  const attributes = block.attributes
  const current = attributes.current?.trim()
  const body = block.rawSource.slice(block.rawSource.indexOf('\n') + 1, block.rawSource.lastIndexOf('\n')).trim()
  const notes = attributes.notes !== undefined ? decode(attributes.notes) : body
  const recovery = attributes.recovery
  return {
    title: attributes.name !== undefined ? decode(attributes.name) : block.title,
    current: current && Number.isFinite(Number(current)) ? Number(current) : null,
    maximum: attributes['maximum-formula'] !== undefined
      ? decode(attributes['maximum-formula']) : attributes.maximum ?? '',
    recovery: recovery === 'short' || recovery === 'long' || recovery === 'either' ? recovery : 'none',
    notes,
    showNotes: attributes['show-notes'] !== undefined ? attributes['show-notes'] === 'true' : Boolean(notes),
  }
}

export function resourceToSource(value: ContentResourceValue, attributes: Readonly<Record<string, string>> = {}) {
  // Свободный текст хранится кодированным: ], кавычки и ::: не ломают структуру документа.
  const title = value.title.replace(/[\]\r\n]/g, ' ')
  const attrs = {
    ...attributes,
    name: encodeURIComponent(value.title),
    current: value.current === null ? '' : String(value.current),
    'maximum-formula': encodeURIComponent(value.maximum),
    recovery: value.recovery,
    notes: encodeURIComponent(value.notes),
    'show-notes': String(value.showNotes),
  }
  return `:::resource[${title}]{${Object.entries(attrs).map(([key, text]) => `${key}="${text.replace(/"/g, '%22')}"`).join(' ')}}\n:::`
}
