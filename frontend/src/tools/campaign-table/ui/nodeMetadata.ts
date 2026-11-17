import { containerOf } from '../model/nodeContainment'
import type { TableNode } from '../model/table'

export type NodeMember = { id: string; title: string }
export type ContainerMembers = ReadonlyMap<string, readonly NodeMember[]>
type DiagramMetadata = { id: string; name: string }

/** Геометрия не меняет индекс и ссылки на неизменившееся содержимое контейнеров. */
export function indexContainerMembers(nodes: readonly TableNode[], previous: ContainerMembers = new Map()): ContainerMembers {
  const next = new Map<string, NodeMember[]>()
  for (const node of nodes) {
    const containerId = containerOf(node)
    if (!containerId) continue
    let members = next.get(containerId)
    if (!members) { members = []; next.set(containerId, members) }
    const before = previous.get(containerId)?.[members.length]
    members.push(before?.id === node.id && before.title === node.data.title ? before : { id: node.id, title: node.data.title })
  }
  const result = new Map<string, readonly NodeMember[]>()
  let unchanged = next.size === previous.size
  for (const [id, members] of next) {
    const before = previous.get(id)
    const same = before?.length === members.length && members.every((member, index) => member === before[index])
    result.set(id, same ? before : members)
    if (!same) unchanged = false
  }
  return unchanged ? previous : result
}

/** Обновления узлов и рёбер не меняют список схем в меню ноды. */
export function stableDiagramMetadata(diagrams: DiagramMetadata[], previous: DiagramMetadata[] = []): DiagramMetadata[] {
  return diagrams.length === previous.length && diagrams.every((diagram, index) =>
    diagram.id === previous[index].id && diagram.name === previous[index].name)
    ? previous : diagrams.map(({ id, name }) => ({ id, name }))
}
