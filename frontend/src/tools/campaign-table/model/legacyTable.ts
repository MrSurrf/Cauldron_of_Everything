// Валидатор прежних документов v1/v2. Новые документы пишутся только через table.ts.
import type { Edge, Node, Viewport, XYPosition } from '@xyflow/react'
import type { BaseEntity } from '../../../entities/base'
import type { LibraryReference, LibrarySection } from './library'

export type CanvasEntity = BaseEntity<'location' | 'note'> & { description: string }
export type InstanceData = {
  localEntityId?: string
  reference?: LibraryReference
  title: string
  description: string
  facts: string
  state: string
  locationId?: string
}
export type TableNode = Node<InstanceData, 'entity' | 'location' | 'note'>
export type TableEdge = Edge<{ description?: string }> & { label?: string }
export type Diagram = { id: string; name: string; nodes: TableNode[]; edges: TableEdge[]; viewport: Viewport }
export type CampaignTable = {
  version: 2
  activeId: string
  diagrams: Diagram[]
  entities?: CanvasEntity[]
  layout: { libraryWidth: number; inspectorWidth: number; section: LibrarySection; query: string }
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
  const localEntities = new Map<string, Record<string, unknown>>()
  if (value.entities != null) {
    if (!Array.isArray(value.entities)) return invalid()
    for (const entity of value.entities) {
      if (!record(entity) || !text(entity.id) || !entity.id || localEntities.has(entity.id)
        || !['location', 'note'].includes(String(entity.entityType)) || !text(entity.slug)
        || !text(entity.name) || !entity.name.trim() || !text(entity.description)) return invalid()
      localEntities.set(entity.id, entity)
    }
  }
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
      if (!['entity', 'location', 'note'].includes(String(node.type)) || !text(data.title) || !text(data.description) || !text(data.facts) || !text(data.state)
        || (data.locationId !== undefined && (!text(data.locationId) || !data.locationId))
        || (data.localEntityId !== undefined && (!text(data.localEntityId) || !data.localEntityId))
        || (node.width != null && (!finite(node.width) || node.width < 160)) || (node.height != null && (!finite(node.height) || node.height < 56))) return invalid()
      if (data.localEntityId && localEntities.get(data.localEntityId)?.entityType !== node.type) return invalid()
      if (node.type === 'note' && !data.localEntityId) return invalid()
      if (node.type === 'entity') {
        const ref = data.reference
        if (!record(ref) || !text(ref.entityId) || !ref.entityId || !text(ref.entityType) || !text(ref.name) || !text(ref.slug)
          || !['creature', 'class', 'race', 'background', 'feat', 'spell', 'item', 'sidekick', 'reference', 'character', 'npc', 'campaign'].includes(ref.entityType)
          || !['encyclopedia', 'character', 'campaign'].includes(String(ref.source)) || !Array.isArray(ref.facts) || !ref.facts.every(text)) return invalid()
      }
      nodes.set(node.id, node)
    }
    for (const node of diagram.nodes as TableNode[]) {
      if (node.data.locationId && (!(node.type === 'entity' && ['creature', 'character', 'npc'].includes(node.data.reference?.entityType ?? '')) || nodes.get(node.data.locationId)?.type !== 'location')) return invalid()
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
  if (legacy) { value.version = 2; value.layout = { libraryWidth: 336, inspectorWidth: 380, section: 'creature', query: '' } }
  if (!record(value.layout) || !finite(value.layout.libraryWidth) || !finite(value.layout.inspectorWidth)
    || !text(value.layout.section) || !['creature', 'class', 'race', 'background', 'feat', 'spell', 'item', 'reference', 'character', 'campaign'].includes(value.layout.section)
    || !text(value.layout.query)) return invalid()
  value.layout.libraryWidth = Math.max(260, Math.min(650, value.layout.libraryWidth))
  value.layout.inspectorWidth = Math.max(300, Math.min(800, value.layout.inspectorWidth))
  return value as CampaignTable
}
