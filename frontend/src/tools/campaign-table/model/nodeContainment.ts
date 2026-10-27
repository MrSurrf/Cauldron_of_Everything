import { emptyItem, itemFromBlock, itemToSource, parseContentSource } from '../../../shared/ui/ContentEditor'
import type { CanvasEntity, Diagram, TableNode } from './table'

/** locationId оставлен для совместимости сохранённых схем; containerId — снаряжение персонажа. */
export const containerOf = (node: { data: { locationId?: string; containerId?: string } }) => node.data.containerId ?? node.data.locationId

export function canPlaceInside(source: TableNode, target: TableNode): boolean {
  if (source.id === target.id) return false
  if (target.type === 'location') return ['creature', 'playerCharacter', 'npc', 'item'].includes(source.data.entityType)
  return target.data.entityType === 'playerCharacter' && source.data.entityType === 'item'
}

export function moveInside(diagram: Diagram, id: string, targetId?: string, position?: { x: number; y: number }): Diagram {
  const node = diagram.nodes.find(item => item.id === id)
  const target = diagram.nodes.find(item => item.id === targetId)
  if (!node || (targetId && (!target || !canPlaceInside(node, target)))) return diagram
  if (target?.data.entityType === 'playerCharacter' && !target.data.campaignCharacter) return diagram
  const previous = diagram.nodes.find(item => item.id === containerOf(node))
  const nextPosition = position ?? (previous && !targetId
    ? { x: previous.position.x + (previous.width ?? 240) + 40, y: previous.position.y } : node.position)
  const locationId = target?.type === 'location' ? target.id : undefined
  const containerId = target?.data.entityType === 'playerCharacter' ? target.id : undefined
  if (node.data.locationId === locationId && node.data.containerId === containerId
    && node.position.x === nextPosition.x && node.position.y === nextPosition.y) return diagram
  const data = node.data.locationId === locationId && node.data.containerId === containerId
    ? node.data : { ...node.data, locationId, containerId }
  return { ...diagram, nodes: diagram.nodes.map(item => item.id === id ? { ...item,
    position: nextPosition, data,
  } : item) }
}

/** Изменение принадлежности и снаряжения — одна операция, включая Undo/Redo графа. */
export function syncContainedEquipment(before: Diagram, after: Diagram, entities: Map<string, CanvasEntity>) {
  let result = after
  const oldNodes = new Map(before.nodes.map(node => [node.id, node]))
  const newNodes = new Map(after.nodes.map(node => [node.id, node]))
  for (const id of new Set([...oldNodes.keys(), ...newNodes.keys()])) {
    const previous = oldNodes.get(id), current = newNodes.get(id)
    if (previous?.data.containerId === current?.data.containerId) continue
    const key = encodeURIComponent(JSON.stringify([before.id, id]))
    let itemSource = current?.data.equipmentSource ?? previous?.data.equipmentSource
    const oldOwner = oldNodes.get(previous?.data.containerId ?? '')
    const newOwner = newNodes.get(current?.data.containerId ?? '')
    if (oldOwner) {
      const owner = entities.get(oldOwner.data.entityId)
      if (owner?.campaignCharacter) {
        const document = owner.campaignCharacter.document
        const source = document.equipmentContentText ?? ''
        const block = parseContentSource(source).find(block => block.kind === 'item' && block.attributes['campaign-placement'] === key)
        if (block) {
          itemSource = source.slice(block.sourceRange.start, block.sourceRange.end)
          // При извлечении сохраняем количество, настройку и правки виджета у размещения предмета.
          result = { ...result, nodes: result.nodes.map(node => node.id === id
            ? { ...node, data: { ...node.data, equipmentSource: itemSource } } : node) }
          entities.set(owner.id, { ...owner, campaignCharacter: { ...owner.campaignCharacter, document: { ...document,
            equipmentContentText: source.slice(0, block.sourceRange.start) + source.slice(block.sourceRange.end),
          } } })
        }
      }
    }
    if (!newOwner || !current) continue
    const owner = entities.get(newOwner.data.entityId)
    if (!owner?.campaignCharacter) continue
    const entry = current.data.statBlock?.kind === 'item' ? current.data.statBlock.entry : undefined
    const data = entry?.data ?? {}
    const field = (...keys: string[]) => {
      const value = keys.map(key => data[key]).find(value => typeof value === 'string' || typeof value === 'number')
      return value === undefined ? '' : String(value)
    }
    itemSource ??= itemToSource({ ...emptyItem, title: current.data.title,
      description: entry?.content_text ?? current.data.description,
      rarity: field('rarity'), cost: field('cost', 'price'), itemType: field('classification', 'item_type', 'type'),
    }, { 'campaign-placement': key,
      ...(current.data.reference?.source === 'encyclopedia' ? { 'entity-id': current.data.reference.entityId } : {}),
    })
    const savedItem = parseContentSource(itemSource).find(block => block.kind === 'item')
    if (savedItem?.kind === 'item') itemSource = itemToSource(itemFromBlock(savedItem), { ...savedItem.attributes, 'campaign-placement': key })
    const document = owner.campaignCharacter.document
    const source = document.equipmentContentText ?? ''
    entities.set(owner.id, { ...owner, campaignCharacter: { ...owner.campaignCharacter, document: { ...document,
      equipmentContentText: `${source}${source ? '\n\n' : ''}${itemSource}`,
    } } })
  }
  return result
}
