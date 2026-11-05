import { canResizeNode, EXPANDED_CREATURE_WIDTH, nodeMinimumSize, nodeVisual } from '../model/nodeGeometry'
import type { InstanceData, TableEdge, TableNode } from '../model/table'

type NodeDisplay = {
  expanded: boolean
  hidden: boolean
  linking: boolean
  draft: boolean
  arrivalKey?: number
  measured?: TableNode['measured']
}
const nodes = new WeakMap<TableNode, { display: NodeDisplay; node: TableNode }>()
const data = new WeakMap<InstanceData, { expanded: boolean; arrivalKey?: number; value: InstanceData }>()
const edges = new WeakMap<TableEdge, { selected: boolean; hidden: boolean; edge: TableEdge }>()

function displayData(original: InstanceData, expanded: boolean, arrivalKey?: number) {
  if (!expanded && arrivalKey === undefined) return original
  const previous = data.get(original)
  if (previous?.expanded === expanded && previous.arrivalKey === arrivalKey) return previous.value
  const value = { ...original, display: { ...original.display,
    ...(expanded ? { creatureExpanded: true } : {}), ...(arrivalKey === undefined ? {} : { arrivalKey }) } }
  data.set(original, { expanded, arrivalKey, value })
  return value
}

/** Геометрия одной ноды не меняет объекты отображения её соседей и их data. */
export function projectFlowNode(node: TableNode, display: NodeDisplay): TableNode {
  const previous = nodes.get(node)
  if (previous && previous.display.expanded === display.expanded && previous.display.hidden === display.hidden
    && previous.display.linking === display.linking && previous.display.draft === display.draft
    && previous.display.arrivalKey === display.arrivalKey && previous.display.measured === display.measured) return previous.node
  const expanded = node.data.entityType === 'creature' && display.expanded
  const resize = canResizeNode(node.data.entityType)
  const result: TableNode = { ...node,
    width: expanded ? EXPANDED_CREATURE_WIDTH : resize
      ? Math.max(nodeMinimumSize(node.data.entityType).width, node.width ?? nodeVisual(node.data.entityType).width)
      : nodeVisual(node.data.entityType).width,
    height: expanded || !resize || node.height === undefined ? undefined : Math.max(nodeMinimumSize(node.data.entityType).height, node.height),
    data: displayData(node.data, expanded, display.arrivalKey),
    hidden: display.hidden,
    measured: display.measured ?? node.measured,
    className: [node.className, display.linking ? 'nopan' : undefined].filter(Boolean).join(' '),
    draggable: display.draft ? false : node.draggable,
  }
  nodes.set(node, { display, node: result })
  return result
}

export function projectFlowEdge(edge: TableEdge, selected: boolean, hidden: boolean): TableEdge {
  const previous = edges.get(edge)
  if (previous?.selected === selected && previous.hidden === hidden) return previous.edge
  const result = { ...edge, type: 'contour', sourceHandle: 'out', targetHandle: 'in', selected, hidden }
  edges.set(edge, { selected, hidden, edge: result })
  return result
}
