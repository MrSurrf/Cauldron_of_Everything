import type { ContentBlock } from './contentCodec'
import { decodeAttribute, directiveBody } from './sectionContent'

export type ItemBlock = Extract<ContentBlock, { kind: 'item' }>
export type ContentItemValue = {
  title: string
  quantity: string
  description: string
  rarity: string
  cost: string
  itemType: string
  attuned: boolean
  equipped: boolean
}

export const emptyItem: ContentItemValue = {
  title: '',
  quantity: '1',
  description: '',
  rarity: '',
  cost: '',
  itemType: '',
  attuned: false,
  equipped: false,
}

function booleanAttribute(value: string | undefined) {
  return value === 'true' || value === '1'
}

export function itemFromBlock(block: ItemBlock): ContentItemValue {
  return {
    title: decodeAttribute(block.attributes.name ?? block.title),
    quantity: block.attributes.quantity ?? '1',
    description: decodeAttribute(block.attributes.description ?? directiveBody(block.rawSource)),
    rarity: decodeAttribute(block.attributes.rarity ?? ''),
    cost: decodeAttribute(block.attributes.cost ?? ''),
    itemType: decodeAttribute(block.attributes['item-type'] ?? block.attributes.type ?? ''),
    attuned: booleanAttribute(block.attributes.attuned ?? block.attributes.attunement),
    equipped: booleanAttribute(block.attributes.equipped),
  }
}

export function itemToSource(
  value: ContentItemValue,
  attributes: Readonly<Record<string, string>> = {},
) {
  const attrs: Record<string, string> = {
    ...attributes,
    name: encodeURIComponent(value.title),
    quantity: value.quantity,
    description: encodeURIComponent(value.description),
    rarity: encodeURIComponent(value.rarity),
    cost: encodeURIComponent(value.cost),
    'item-type': encodeURIComponent(value.itemType),
    attuned: String(value.attuned),
    equipped: String(value.equipped),
  }
  delete attrs.type
  delete attrs.attunement

  const header = Object.entries(attrs)
    .map(([key, text]) => `${key}="${text.replace(/"/g, '%22')}"`)
    .join(' ')

  return `:::item[${value.title.replace(/[\]\r\n]/g, ' ')}]{${header}}\n:::`
}
