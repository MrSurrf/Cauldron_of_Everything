import { itemFromBlock, itemToSource, type ContentItemValue } from '../../../shared/ui/ContentEditor/itemContent'
import { parseContentSource } from '../../../shared/ui/ContentEditor/contentCodec'

function replaceBlock(source: string, start: number, end: number, replacement: string) {
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`
}

/** Добавляет предмет в существующее поле снаряжения как штатный виджет ContentEditor. */
export function importEquipmentItem(source: string, entityId: number, itemSource: string): string {
  const existing = parseContentSource(source).find((block) =>
    block.kind === 'item' && block.attributes['entity-id'] === String(entityId),
  )
  if (existing?.kind === 'item') {
    const value = itemFromBlock(existing)
    const quantity = Math.max(1, Number.parseInt(value.quantity, 10) || 1) + 1
    return replaceBlock(source, existing.sourceRange.start, existing.sourceRange.end,
      itemToSource({ ...value, quantity: String(quantity) }, existing.attributes))
  }
  const separator = source.length === 0 ? '' : source.endsWith('\n') ? '\n' : '\n\n'
  return `${source}${separator}${itemSource}`
}

/** Дополняет только пустые поля; правки игрока, сделанные после переноса, сохраняются. */
export function enrichEquipmentItem(source: string, entityId: number, patch: Partial<ContentItemValue>): string {
  const existing = parseContentSource(source).find((block) =>
    block.kind === 'item' && block.attributes['entity-id'] === String(entityId),
  )
  if (existing?.kind !== 'item') return source
  const value = itemFromBlock(existing)
  const next = { ...value }
  for (const key of Object.keys(patch) as (keyof ContentItemValue)[]) {
    if (!patch[key] || value[key]) continue
    Object.assign(next, { [key]: patch[key] })
  }
  return replaceBlock(source, existing.sourceRange.start, existing.sourceRange.end,
    itemToSource(next, existing.attributes))
}
