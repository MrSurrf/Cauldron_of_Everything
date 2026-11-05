import { containerOf } from '../model/nodeContainment'
import type { CanvasEntity, Diagram, InstanceData, TableEdge, TableNode } from '../model/table'

export type InspectorMember = { id: string; entityId: string; title: string; entityType: InstanceData['entityType'] }
type GraphRelations = {
  nodes: { id: string; data: InstanceData }[]
  edges: { source: string; target: string }[]
  members: Map<string, InspectorMember[]>
  placements: Map<string, number>
  related: Map<string, Set<string>>
}
type DiagramRelations = { id: string; nodeSource: TableNode[]; edgeSource: TableEdge[]; graph: GraphRelations }
export type InspectorRelations = {
  nodeId: string
  entityId: string
  diagram: Diagram
  diagrams: Diagram[]
  entities: CanvasEntity[]
  indexes: DiagramRelations[]
  active: DiagramRelations
  members: InspectorMember[]
  related: CanvasEntity[]
  placements: number
}

function indexDiagram(diagram: Diagram, previous?: DiagramRelations): DiagramRelations {
  if (previous?.nodeSource === diagram.nodes && previous.edgeSource === diagram.edges) return previous
  const graph = previous?.graph
  const sameNodes = previous?.nodeSource === diagram.nodes || (graph?.nodes.length === diagram.nodes.length
    && diagram.nodes.every((node, index) => node.id === graph.nodes[index].id && node.data === graph.nodes[index].data))
  const sameEdges = previous?.edgeSource === diagram.edges || (graph?.edges.length === diagram.edges.length
    && diagram.edges.every((edge, index) => edge.source === graph.edges[index].source && edge.target === graph.edges[index].target))
  if (graph && sameNodes && sameEdges) return { id: diagram.id, nodeSource: diagram.nodes, edgeSource: diagram.edges, graph }

  const nodes = diagram.nodes.map(({ id, data }) => ({ id, data }))
  const nodeEntities = new Map(nodes.map(node => [node.id, node.data.entityId]))
  const members = new Map<string, InspectorMember[]>(), placements = new Map<string, number>()
  const related = new Map<string, Set<string>>()
  for (const node of nodes) {
    placements.set(node.data.entityId, (placements.get(node.data.entityId) ?? 0) + 1)
    const owner = containerOf(node)
    if (owner) {
      const member = { id: node.id, entityId: node.data.entityId, title: node.data.title, entityType: node.data.entityType }
      const list = members.get(owner)
      if (list) list.push(member); else members.set(owner, [member])
    }
  }
  const connect = (from: string, to: string) => {
    const targets = related.get(from)
    if (targets) targets.add(to); else related.set(from, new Set([to]))
  }
  const edges = diagram.edges.map(({ source, target }) => ({ source, target }))
  for (const edge of edges) {
    const source = nodeEntities.get(edge.source), target = nodeEntities.get(edge.target)
    if (source && target) { connect(source, target); connect(target, source) }
  }
  return { id: diagram.id, nodeSource: diagram.nodes, edgeSource: diagram.edges,
    graph: { nodes, edges, members, placements, related } }
}

/** Координаты, размеры и выделение не меняют содержимое wiki и связи между Entity. */
export function prepareInspectorRelations(nodeId: string, entityId: string, diagram: Diagram, diagrams: Diagram[], entities: CanvasEntity[], previous?: InspectorRelations): InspectorRelations {
  const oldIndexes = new Map(previous?.indexes.map(index => [index.id, index]))
  const indexes = diagrams.map(item => indexDiagram(item, oldIndexes.get(item.id)))
  const active = indexes.find(index => index.id === diagram.id) ?? indexDiagram(diagram,
    previous?.active.id === diagram.id ? previous.active : undefined)
  let members = active.graph.members.get(nodeId) ?? []
  if (previous && members.length === previous.members.length && members.every((member, index) => {
    const before = previous.members[index]
    return member.id === before.id && member.entityId === before.entityId
      && member.title === before.title && member.entityType === before.entityType
  })) members = previous.members
  const placements = indexes.reduce((total, index) => total + (index.graph.placements.get(entityId) ?? 0), 0)
  const sameGraphs = previous && indexes.length === previous.indexes.length
    && indexes.every((index, i) => index.graph === previous.indexes[i].graph)
  let related = previous && sameGraphs && previous.entities === entities && previous.entityId === entityId
    && previous.members === members ? previous.related : undefined
  if (!related) {
    const ids = new Set<string>(), memberIds = new Set(members.map(member => member.entityId))
    for (const index of indexes) for (const id of index.graph.related.get(entityId) ?? []) ids.add(id)
    related = entities.filter(entity => ids.has(entity.id) && !memberIds.has(entity.id))
    if (previous && related.length === previous.related.length
      && related.every((entity, i) => entity === previous.related[i])) related = previous.related
  }
  return { nodeId, entityId, diagram, diagrams, entities, indexes, active, members, related, placements }
}
