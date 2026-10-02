import type { Edge, Node, Viewport, XYPosition } from '@xyflow/react'
import type { BaseEntity, EntityType } from '../../../entities/base'
import type { LibraryReference, LibrarySection } from './library'
import { parseTable as parseLegacyTable } from './legacyTable'
import { validStatBlock } from './instanceStatBlock'
import type { InstanceStatBlock } from './instanceStatBlock'

export const NODE_ENTITY_TYPES = ['playerCharacter', 'npc', 'creature', 'location', 'quest', 'faction', 'item', 'spell', 'note'] as const
export type NodeEntityType = typeof NODE_ENTITY_TYPES[number]
// Остальные разделы библиотеки сохраняют универсальное представление.
const entityTypes: EntityType[] = [...NODE_ENTITY_TYPES, 'class', 'race', 'background', 'feat', 'sidekick', 'reference', 'campaign']
export type CanvasEntity = BaseEntity & {
  description: string
  facts: string
  state: string
  reference?: LibraryReference
  statBlock?: InstanceStatBlock
}
export type PlacementData = { entityId: string; locationId?: string }
export type EntityNode = Node<PlacementData, 'entity' | 'location' | 'note'>
export type TableEdge = Edge<{ description?: string }> & { label?: string }
export type StoredDiagram = { id: string; name: string; nodes: EntityNode[]; edges: TableEdge[]; viewport: Viewport }
export type CampaignTable = {
  version: 3; activeId: string; diagrams: StoredDiagram[]; entities: CanvasEntity[]
  layout: { libraryWidth: number; inspectorWidth: number; section: LibrarySection; query: string }
}
// Только проекция для прежних редакторов и React Flow, никогда не хранится в документе.
export type InstanceData = PlacementData & {
  entityType: EntityType; reference?: LibraryReference
  title: string; description: string; facts: string; state: string
  statBlock?: InstanceStatBlock
}
export type TableNode = Node<InstanceData, EntityNode['type']>
export type Diagram = Omit<StoredDiagram, 'nodes'> & { nodes: TableNode[] }
export const LEGACY_STORAGE_KEY = 'cauldron.campaign-table.v1'
// Сохраняем ключ и механизм localStorage; версия относится к формату документа.
export const TABLE_STORAGE_KEY = 'cauldron.campaign-table.v2'
export const canonicalType = (type: EntityType): EntityType => type === 'character' ? 'playerCharacter' : type
const placementType = (type: EntityType): EntityNode['type'] => type === 'location' || type === 'note' ? type : 'entity'

export function createDiagram(name = 'Основная схема'): StoredDiagram {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
}
export function createTable(): CampaignTable {
  const diagram = createDiagram()
  return { version: 3, activeId: diagram.id, diagrams: [diagram], entities: [],
    layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' } }
}
export function createPlacement(entity: CanvasEntity, position: XYPosition): EntityNode {
  return { id: crypto.randomUUID(), type: placementType(entity.entityType), position, data: { entityId: entity.id } }
}
export function createCanvasObject(type: NodeEntityType, position: XYPosition) {
  const id = crypto.randomUUID()
  const entity: CanvasEntity = { id, slug: id, entityType: type, name: '', description: '', facts: '', state: '' }
  return { entity, node: createPlacement(entity, position) }
}
export function createInstance(reference: LibraryReference, position: XYPosition) {
  const object = createCanvasObject('creature', position)
  object.entity = { ...object.entity, entityType: canonicalType(reference.entityType), name: reference.name,
    reference: structuredClone(reference), facts: reference.facts.join(' · ') }
  object.node.type = placementType(object.entity.entityType)
  return object
}
export function placeCanvasObject(table: CampaignTable, diagramId: string, object: { entity: CanvasEntity; node: EntityNode }, name: string): CampaignTable {
  if (!name.trim() || !table.diagrams.some(item => item.id === diagramId)
    || table.entities.some(entity => entity.id === object.entity.id)) return table
  return { ...table, entities: [...table.entities, { ...object.entity, name: name.trim() }],
    diagrams: table.diagrams.map(item => item.id === diagramId ? { ...item, nodes: [...item.nodes, object.node] } : item) }
}
export function placeExistingEntity(table: CampaignTable, diagramId: string, entityId: string, position: XYPosition): CampaignTable {
  const entity = table.entities.find(item => item.id === entityId)
  if (!entity) return table
  return { ...table, diagrams: table.diagrams.map(diagram => diagram.id === diagramId
    ? { ...diagram, nodes: [...diagram.nodes, createPlacement(entity, position)] } : diagram) }
}
export function updateCanvasEntity(table: CampaignTable, id: string, changes: Partial<Pick<CanvasEntity, 'name' | 'description' | 'facts' | 'state'>>): CampaignTable {
  if (changes.name !== undefined && !changes.name.trim()) return table
  return { ...table, entities: table.entities.map(entity => entity.id === id
    ? { ...entity, ...changes, name: changes.name?.trim() ?? entity.name } : entity) }
}
export function resolveNode(node: EntityNode, entity: CanvasEntity): TableNode {
  return { ...node, data: { ...node.data, entityType: entity.entityType, title: entity.name,
    description: entity.description, facts: entity.facts, state: entity.state, reference: entity.reference, statBlock: entity.statBlock } }
}
export function resolveDiagram(table: CampaignTable, diagram: StoredDiagram): Diagram {
  const entities = new Map(table.entities.map(entity => [entity.id, entity]))
  return { ...diagram, nodes: diagram.nodes.map(node => resolveNode(node, entities.get(node.data.entityId)!)) }
}
function placement(node: TableNode): EntityNode {
  return { ...node, data: { entityId: node.data.entityId, ...(node.data.locationId ? { locationId: node.data.locationId } : {}) } }
}
// Граница между существующими UI-редакторами и нормализованным документом.
// Геометрия остаётся у размещения; изменения содержимого попадают в Entity.
export function changeDiagram(table: CampaignTable, id: string, update: (diagram: Diagram) => Diagram): CampaignTable {
  const stored = table.diagrams.find(diagram => diagram.id === id)
  if (!stored) return table
  const before = resolveDiagram(table, stored)
  const after = update(before)
  const previousNodes = new Map(before.nodes.map(node => [node.id, node.data]))
  const entities = new Map(table.entities.map(entity => [entity.id, entity]))
  for (const node of after.nodes) {
    const previous = previousNodes.get(node.id)
    const data = node.data
    const entity = entities.get(data.entityId)
    if (!entity) throw new Error('Размещение ссылается на отсутствующую Entity')
    if (previous && (previous.title !== data.title || previous.description !== data.description || previous.facts !== data.facts || previous.state !== data.state || previous.statBlock !== data.statBlock)) {
      entities.set(entity.id, { ...entity, name: data.title.trim() || entity.name, description: data.description, facts: data.facts, state: data.state, statBlock: data.statBlock })
    }
  }
  return { ...table, entities: [...entities.values()], diagrams: table.diagrams.map(diagram => diagram.id === id
    ? { ...after, nodes: after.nodes.map(placement) } : diagram) }
}
export function duplicatePlacement(table: CampaignTable, diagramId: string, nodeId: string, placementId: string = crypto.randomUUID()): CampaignTable {
  const diagram = table.diagrams.find(item => item.id === diagramId)
  const node = diagram?.nodes.find(item => item.id === nodeId)
  const entity = table.entities.find(item => item.id === node?.data.entityId)
  if (!node || !entity) return table
  // Прежняя команда для библиотечных экземпляров создаёт независимый экземпляр.
  // Для общих объектов — только размещение. «На другую схему» всегда разделяет Entity.
  const id = entity.reference ? crypto.randomUUID() : entity.id
  const copy = { ...structuredClone(node), id: placementId, selected: false,
    position: { x: node.position.x + 40, y: node.position.y + 40 }, data: { ...node.data, entityId: id } }
  const entityCopy = { ...structuredClone(entity), id, slug: id }
  if (entityCopy.statBlock?.kind === 'creature') entityCopy.statBlock.entity.id = id
  if (entityCopy.statBlock?.kind === 'playerCharacter') entityCopy.statBlock.document.id = id
  return { ...table, entities: id === entity.id ? table.entities : [...table.entities, entityCopy],
    diagrams: table.diagrams.map(item => item.id === diagramId ? { ...item, nodes: [...item.nodes, copy] } : item) }
}
export function canContain(node: TableNode): boolean {
  return ['creature', 'playerCharacter', 'npc'].includes(node.data.entityType)
}
export function moveToLocation(diagram: Diagram, id: string, locationId?: string, position?: XYPosition): Diagram {
  const node = diagram.nodes.find(item => item.id === id)
  const location = diagram.nodes.find(item => item.id === locationId && item.type === 'location')
  if (!node || (locationId && (!location || !canContain(node)))) return diagram
  const previous = diagram.nodes.find(item => item.id === node.data.locationId)
  return { ...diagram, nodes: diagram.nodes.map(item => item.id === id ? { ...item,
    position: position ?? (previous && !locationId ? { x: previous.position.x + (previous.width ?? 240) + 40, y: previous.position.y } : item.position),
    data: { ...item.data, locationId } } : item) }
}
export function removeInstances(diagram: Diagram, ids: Set<string>): Diagram {
  const nodes = diagram.nodes.filter(node => !ids.has(node.id)).map(node => {
    if (!node.data.locationId || !ids.has(node.data.locationId)) return node
    const parent = diagram.nodes.find(item => item.id === node.data.locationId)!
    return { ...node, position: { x: parent.position.x + 30, y: parent.position.y + 40 }, data: { ...node.data, locationId: undefined } }
  })
  return { ...diagram, nodes, edges: diagram.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target)) }
}
export function serializeTable(table: CampaignTable): string {
  return JSON.stringify({ ...table, diagrams: table.diagrams.map(diagram => ({ ...diagram,
    nodes: diagram.nodes.map(({ id, type, position, data, width, height }) => ({ id, type, position,
      data: { entityId: data.entityId, ...(data.locationId ? { locationId: data.locationId } : {}) }, width, height })),
    edges: diagram.edges.map(({ id, source, target, label, data }) => ({ id, source, target, label, data })),
  })) })
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function text(value: unknown): value is string { return typeof value === 'string' }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function point(value: unknown): value is XYPosition { return record(value) && finite(value.x) && finite(value.y) }
export function validReference(ref: unknown): ref is LibraryReference {
  return record(ref) && text(ref.entityId) && Boolean(ref.entityId) && text(ref.name) && text(ref.slug)
    && ['encyclopedia', 'character', 'campaign'].includes(String(ref.source))
    && [...entityTypes, 'character'].includes(ref.entityType as EntityType) && Array.isArray(ref.facts) && ref.facts.every(text)
}

function migrateLegacy(raw: string): CampaignTable {
  const old = parseLegacyTable(raw)
  const entities = new Map<string, CanvasEntity>((old.entities ?? []).map(entity => [entity.id, { ...entity, facts: '', state: '' }]))
  const diagrams = old.diagrams.map(diagram => ({ ...diagram, nodes: diagram.nodes.map(node => {
    let id = node.data.localEntityId
    if (!id) {
      id = `instance:${JSON.stringify([diagram.id, node.id])}`
      while (entities.has(id)) id += ':copy'
    }
    if (!entities.has(id)) entities.set(id, { id, slug: id, entityType: node.type === 'location' ? 'location' : node.type === 'note' ? 'note' : canonicalType(node.data.reference!.entityType),
      name: node.data.title.trim() || node.data.reference?.name || 'Без названия', description: node.data.description, facts: node.data.facts, state: node.data.state, reference: node.data.reference })
    const defaultWidth = node.type === 'location' ? 340 : 260
    const defaultHeight = node.type === 'location' ? 260 : 150
    return { id: node.id, type: node.type, position: node.position,
      width: node.width === defaultWidth ? undefined : node.width, height: node.height === defaultHeight ? undefined : node.height,
      data: { entityId: id, ...(node.data.locationId ? { locationId: node.data.locationId } : {}) } }
  }), edges: diagram.edges.map(({ id, source, target, label, data }) => ({ id, source, target, label, data })) }))
  return { ...old, version: 3, entities: [...entities.values()], diagrams }
}
export function parseTable(raw: string): CampaignTable {
  const value: unknown = JSON.parse(raw)
  const invalid = (): never => { throw new Error('Сохранённые схемы имеют неподдерживаемый или повреждённый формат.') }
  if (record(value) && (value.version === 1 || value.version === 2)) return parseTable(serializeTable(migrateLegacy(raw)))
  if (!record(value) || value.version !== 3 || !Array.isArray(value.entities) || !Array.isArray(value.diagrams) || !value.diagrams.length) return invalid()
  const entities = new Map<string, CanvasEntity>()
  for (const entity of value.entities) {
    if (!record(entity) || !text(entity.id) || !entity.id || entities.has(entity.id) || !entityTypes.includes(entity.entityType as EntityType)
      || !text(entity.slug) || !text(entity.name) || !entity.name.trim() || !text(entity.description) || !text(entity.facts) || !text(entity.state)
      || (entity.reference !== undefined && !validReference(entity.reference))
      || (entity.statBlock !== undefined && !validStatBlock(entity.statBlock, String(entity.entityType)))) return invalid()
    entities.set(entity.id, entity as CanvasEntity)
  }
  const diagramIds = new Set<string>()
  for (const diagram of value.diagrams) {
    if (!record(diagram) || !text(diagram.id) || !diagram.id || diagramIds.has(diagram.id) || !text(diagram.name)
      || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges) || !point(diagram.viewport)
      || !('zoom' in diagram.viewport) || !finite(diagram.viewport.zoom) || diagram.viewport.zoom <= 0) return invalid()
    diagramIds.add(diagram.id)
    const nodes = new Map<string, EntityNode>()
    for (const node of diagram.nodes) {
      if (!record(node) || !text(node.id) || !node.id || nodes.has(node.id) || !point(node.position) || !record(node.data)
        || !text(node.data.entityId) || !entities.has(node.data.entityId)
        || node.type !== placementType(entities.get(node.data.entityId)!.entityType)
        || Object.keys(node.data).some(key => !['entityId', 'locationId'].includes(key))
        || (node.data.locationId !== undefined && (!text(node.data.locationId) || !node.data.locationId))
        || (node.width !== undefined && (!finite(node.width) || node.width < 80)) || (node.height !== undefined && (!finite(node.height) || node.height < 48))) return invalid()
      nodes.set(node.id, node as EntityNode)
    }
    for (const node of nodes.values()) {
      if (node.data.locationId && (!['creature', 'playerCharacter', 'npc'].includes(entities.get(node.data.entityId)!.entityType)
        || nodes.get(node.data.locationId)?.type !== 'location')) return invalid()
    }
    const edgeIds = new Set<string>()
    for (const edge of diagram.edges) {
      if (!record(edge) || !text(edge.id) || !edge.id || edgeIds.has(edge.id) || !text(edge.source) || !text(edge.target)
        || !nodes.has(edge.source) || !nodes.has(edge.target) || edge.source === edge.target || (edge.label !== undefined && !text(edge.label))
        || (edge.data !== undefined && (!record(edge.data) || (edge.data.description !== undefined && !text(edge.data.description))))) return invalid()
      edgeIds.add(edge.id)
    }
  }
  if (!text(value.activeId) || !diagramIds.has(value.activeId) || !record(value.layout)
    || !finite(value.layout.libraryWidth) || !finite(value.layout.inspectorWidth) || !text(value.layout.query)
    || !['creature', 'class', 'race', 'background', 'feat', 'spell', 'item', 'reference', 'character', 'campaign'].includes(String(value.layout.section))) return invalid()
  value.layout.libraryWidth = Math.max(260, Math.min(650, value.layout.libraryWidth))
  value.layout.inspectorWidth = Math.max(300, Math.min(800, value.layout.inspectorWidth))
  return value as CampaignTable
}
