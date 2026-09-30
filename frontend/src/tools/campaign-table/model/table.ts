import type { Edge, Node, Viewport } from '@xyflow/react'
import type { CreatureEntity } from '../../../entities/creature'

// Ссылка на общую Entity, а не копия статблока. ID узла — отдельный экземпляр на схеме.
export type CreatureLink = Pick<CreatureEntity, 'id' | 'slug' | 'name'>
export type CreatureNode = Node<{ creature: CreatureLink }, 'creature'>
export type Diagram = {
  id: string
  name: string
  nodes: CreatureNode[]
  edges: Edge[]
  viewport: Viewport
}
export type CampaignTable = { version: 1; activeId: string; diagrams: Diagram[] }
export const TABLE_STORAGE_KEY = 'cauldron.campaign-table.v1'

export function createDiagram(name = 'Основная схема'): Diagram {
  return { id: crypto.randomUUID(), name, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
}

export function createTable(): CampaignTable {
  const diagram = createDiagram()
  return { version: 1, activeId: diagram.id, diagrams: [diagram] }
}

export function serializeTable(table: CampaignTable): string {
  return JSON.stringify({
    ...table,
    diagrams: table.diagrams.map(diagram => ({
      ...diagram,
      nodes: diagram.nodes.map(({ id, position, data }) => ({ id, type: 'creature', position, data })),
      edges: diagram.edges.map(({ id, source, target, sourceHandle, targetHandle }) =>
        ({ id, source, target, sourceHandle, targetHandle })),
    })),
  })
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function point(value: unknown): value is { x: number; y: number } {
  return record(value) && typeof value.x === 'number' && Number.isFinite(value.x)
    && typeof value.y === 'number' && Number.isFinite(value.y)
}

/** Не перезаписываем повреждённый или более новый формат пустой схемой. */
export function parseTable(raw: string): CampaignTable {
  const value: unknown = JSON.parse(raw)
  const invalid = () => { throw new Error('Сохранённые схемы имеют неподдерживаемый или повреждённый формат.') }
  if (!record(value) || value.version !== 1 || !Array.isArray(value.diagrams) || !value.diagrams.length) return invalid()
  const diagramIds = new Set<string>()
  for (const diagram of value.diagrams) {
    if (!record(diagram) || !nonempty(diagram.id) || diagramIds.has(diagram.id) || !nonempty(diagram.name)
      || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)
      || !point(diagram.viewport) || !('zoom' in diagram.viewport)
      || typeof diagram.viewport.zoom !== 'number' || !Number.isFinite(diagram.viewport.zoom)
      || diagram.viewport.zoom <= 0) return invalid()
    diagramIds.add(diagram.id)
    const nodeIds = new Set<string>()
    for (const node of diagram.nodes) {
      if (!record(node) || !nonempty(node.id) || nodeIds.has(node.id) || node.type !== 'creature'
        || !point(node.position) || !record(node.data) || !record(node.data.creature)
        || !nonempty(node.data.creature.id) || !nonempty(node.data.creature.slug)
        || !nonempty(node.data.creature.name)) return invalid()
      nodeIds.add(node.id)
    }
    const edgeIds = new Set<string>()
    for (const edge of diagram.edges) {
      if (!record(edge) || !nonempty(edge.id) || edgeIds.has(edge.id)
        || typeof edge.source !== 'string' || typeof edge.target !== 'string'
        || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
        || (edge.sourceHandle != null && edge.sourceHandle !== 'out')
        || (edge.targetHandle != null && edge.targetHandle !== 'in')) return invalid()
      edgeIds.add(edge.id)
    }
  }
  if (typeof value.activeId !== 'string' || !diagramIds.has(value.activeId)) return invalid()
  return value as CampaignTable
}
