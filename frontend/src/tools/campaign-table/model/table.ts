import type { Edge, Node, Viewport, XYPosition } from '@xyflow/react'
import type { LibraryReference, LibrarySection } from './library'

export type InstanceData = {
  reference?: LibraryReference
  title: string
  description: string
  facts: string
  state: string
  locationId?: string
}
export type TableNode = Node<InstanceData, 'entity' | 'location'>
export type TableEdge = Edge<{ description?: string }> & { label?: string }
export type Diagram = { id: string; name: string; nodes: TableNode[]; edges: TableEdge[]; viewport: Viewport }
export type CampaignTable = {
  version: 2
  activeId: string
  diagrams: Diagram[]
  layout: { libraryWidth: number; inspectorWidth: number; section: LibrarySection; query: string }
}
export const LEGACY_STORAGE_KEY = 'cauldron.campaign-table.v1'
export const TABLE_STORAGE_KEY = 'cauldron.campaign-table.v2'

export function createDiagram(name = 'Основная схема'): Diagram {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
}
export function createTable(): CampaignTable {
  const diagram = createDiagram()
  return { version: 2, activeId: diagram.id, diagrams: [diagram],
    layout: { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' } }
}
export function createInstance(reference: LibraryReference, position: XYPosition): TableNode {
  return { id: crypto.randomUUID(), type: 'entity', position, width: 260, height: 150,
    data: { reference: structuredClone(reference), title: reference.name, description: '', facts: reference.facts.join(' · '), state: '' } }
}
export function createLocation(position: XYPosition): TableNode {
  return { id: crypto.randomUUID(), type: 'location', position, width: 340, height: 260,
    data: { title: 'Новая локация', description: '', facts: '', state: '' } }
}
export function canContain(node: TableNode): boolean {
  return node.type === 'entity' && ['creature', 'character', 'npc'].includes(node.data.reference?.entityType ?? '')
}
export function moveToLocation(diagram: Diagram, id: string, locationId?: string, position?: XYPosition): Diagram {
  const node = diagram.nodes.find(item => item.id === id)
  const location = diagram.nodes.find(item => item.id === locationId && item.type === 'location')
  if (!node || (locationId && (!location || !canContain(node)))) return diagram
  const previous = diagram.nodes.find(item => item.id === node.data.locationId)
  return { ...diagram, nodes: diagram.nodes.map(item => item.id === id ? {
    ...item, position: position ?? (previous && !locationId ? { x: previous.position.x + (previous.width ?? 340) + 40, y: previous.position.y } : item.position),
    data: { ...item.data, locationId },
  } : item) }
}
export function removeInstances(diagram: Diagram, ids: Set<string>): Diagram {
  // Удаление контейнера освобождает содержимое; удаление экземпляра не трогает Entity.
  const released = diagram.nodes.filter(node => !ids.has(node.id)).map(node => {
    if (!node.data.locationId || !ids.has(node.data.locationId)) return node
    const parent = diagram.nodes.find(item => item.id === node.data.locationId)!
    return { ...node, position: { x: parent.position.x + 30, y: parent.position.y + 40 }, data: { ...node.data, locationId: undefined } }
  })
  return { ...diagram, nodes: released, edges: diagram.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target)) }
}
export function serializeTable(table: CampaignTable): string {
  return JSON.stringify({ ...table, diagrams: table.diagrams.map(diagram => ({ ...diagram,
    nodes: diagram.nodes.map(({ id, type, position, data, width, height }) => ({ id, type, position, data, width, height })),
    edges: diagram.edges.map(({ id, source, target, sourceHandle, targetHandle, label, data }) => ({ id, source, target, sourceHandle, targetHandle, label, data })),
  })) })
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function text(value: unknown): value is string { return typeof value === 'string' }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function point(value: unknown): value is XYPosition { return record(value) && finite(value.x) && finite(value.y) }

export function parseTable(raw: string): CampaignTable {
  const value: unknown = JSON.parse(raw)
  const invalid = () => { throw new Error('Сохранённые схемы имеют неподдерживаемый или повреждённый формат.') }
  if (!record(value) || (value.version !== 1 && value.version !== 2) || !Array.isArray(value.diagrams) || !value.diagrams.length) return invalid()
  const legacy = value.version === 1
  const diagramIds = new Set<string>()
  for (const diagram of value.diagrams) {
    if (!record(diagram) || !text(diagram.id) || !diagram.id || diagramIds.has(diagram.id) || !text(diagram.name)
      || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges) || !point(diagram.viewport)
      || !('zoom' in diagram.viewport) || !finite(diagram.viewport.zoom) || diagram.viewport.zoom <= 0) return invalid()
    diagramIds.add(diagram.id)
    const nodes = new Map<string, Record<string, unknown>>()
    for (const node of diagram.nodes) {
      if (!record(node) || !text(node.id) || !node.id || nodes.has(node.id) || !point(node.position) || !record(node.data)) return invalid()
      if (legacy) {
        const ref = node.data.creature
        if (node.type !== 'creature' || !record(ref) || !text(ref.id) || !text(ref.name) || !text(ref.slug)) return invalid()
        node.type = 'entity'; node.width = 260; node.height = 150
        node.data = { title: ref.name, description: '', facts: '', state: '', reference: {
          source: 'encyclopedia', entityId: ref.id, entityType: 'creature', name: ref.name, slug: ref.slug, facts: [],
        } }
      }
      const data = node.data as Record<string, unknown>
      if (!['entity', 'location'].includes(String(node.type)) || !text(data.title) || !text(data.description) || !text(data.facts) || !text(data.state)
        || (data.locationId !== undefined && (!text(data.locationId) || !data.locationId))
        || (node.width != null && (!finite(node.width) || node.width < 160)) || (node.height != null && (!finite(node.height) || node.height < 80))) return invalid()
      if (node.type === 'entity') {
        const ref = data.reference
        if (!record(ref) || !text(ref.entityId) || !ref.entityId || !text(ref.entityType) || !text(ref.name) || !text(ref.slug)
          || !['creature', 'class', 'race', 'background', 'feat', 'spell', 'item', 'sidekick', 'reference', 'character', 'npc', 'campaign'].includes(ref.entityType)
          || !['encyclopedia', 'character', 'campaign'].includes(String(ref.source)) || !Array.isArray(ref.facts) || !ref.facts.every(text)) return invalid()
      }
      nodes.set(node.id, node)
    }
    for (const node of diagram.nodes as TableNode[]) {
      if (node.data.locationId && (!canContain(node) || nodes.get(node.data.locationId)?.type !== 'location')) return invalid()
    }
    const edgeIds = new Set<string>()
    for (const edge of diagram.edges) {
      if (!record(edge) || !text(edge.id) || edgeIds.has(edge.id) || !text(edge.source) || !text(edge.target)
        || !nodes.has(edge.source) || !nodes.has(edge.target) || edge.source === edge.target || (edge.label != null && !text(edge.label))
        || (edge.data != null && (!record(edge.data) || (edge.data.description != null && !text(edge.data.description))))
        || (edge.sourceHandle != null && edge.sourceHandle !== 'out') || (edge.targetHandle != null && edge.targetHandle !== 'in')) return invalid()
      edgeIds.add(edge.id)
    }
  }
  if (!text(value.activeId) || !diagramIds.has(value.activeId)) return invalid()
  if (legacy) { value.version = 2; value.layout = createTable().layout }
  if (!record(value.layout) || !finite(value.layout.libraryWidth) || !finite(value.layout.inspectorWidth)
    || !text(value.layout.section) || !['creature', 'class', 'race', 'background', 'feat', 'spell', 'item', 'reference', 'character', 'campaign'].includes(value.layout.section)
    || !text(value.layout.query)) return invalid()
  value.layout.libraryWidth = Math.max(260, Math.min(650, value.layout.libraryWidth))
  value.layout.inspectorWidth = Math.max(300, Math.min(800, value.layout.inspectorWidth))
  return value as CampaignTable
}
