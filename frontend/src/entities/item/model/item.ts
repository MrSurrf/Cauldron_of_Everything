import type { BaseEntity } from '../../base/model/entity'

export type ItemFact = {
  key: string
  label: string
  value: string
}

export type ItemSection = {
  id: string
  title?: string
  html: string
}

export type ItemTooltip = {
  term: string
  text: string
}

export type ItemTable = {
  id: string
  title?: string
  columns: readonly string[]
  rows: readonly (readonly string[])[]
}

export type ItemEntity = BaseEntity<'item'> & {
  classification?: string
  rarity?: string
  attunement?: string
  facts: readonly ItemFact[]
  tags: readonly string[]
  sources: readonly string[]
  sections: readonly ItemSection[]
  tooltips: readonly ItemTooltip[]
  tables: readonly ItemTable[]
}
