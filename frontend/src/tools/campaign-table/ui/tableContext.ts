import { createContext, useContext } from 'react'
import type { PointerEvent } from 'react'
import type { Diagram, NodeEntityType } from '../model/table'
import type { ContainerMembers } from './nodeMetadata'

export type TableActions = {
  diagram: Diagram
  readOnly: boolean
  beginGesture: () => void
  endGesture: () => void
  diagrams: { id: string; name: string }[]
  connectionSource: string | null
  startConnection: (id: string, pointer?: { x: number; y: number }) => void
  beginConnection: (id: string, event: PointerEvent<HTMLButtonElement>) => void
  dropTarget: string | null
  beginInstanceDrag: (id: string) => void
  placeInside: (id: string, targetId?: string) => void
  placeOnDiagram: (id: string, diagramId: string) => void
  draft?: { id: string; type: NodeEntityType; commit: (name: string) => void; cancel: () => void }
  open: (id: string) => void
  edit: (id: string) => void
  remove: (id: string) => void
  removeEdge: (id: string) => void
  release: (id: string) => void
  duplicate: (id: string) => void
  toggleCreature: (id: string) => void
}
export const TableContext = createContext<TableActions | null>(null)
export function useTableActions() {
  const actions = useContext(TableContext)
  if (!actions) throw new Error('Узел должен находиться внутри пространства кампании')
  return actions
}
export type NodeActions = Pick<TableActions,
  'readOnly' | 'beginGesture' | 'endGesture' | 'diagrams' | 'connectionSource' | 'startConnection'
  | 'beginConnection' | 'dropTarget' | 'beginInstanceDrag' | 'placeOnDiagram' | 'draft'
  | 'open' | 'edit' | 'remove' | 'release' | 'toggleCreature'> & {
  diagramId: string
  membersByContainer: ContainerMembers
}
export const NodeActionsContext = createContext<NodeActions | null>(null)
export function useNodeActions() {
  const actions = useContext(NodeActionsContext)
  if (!actions) throw new Error('Узел должен находиться внутри пространства кампании')
  return actions
}
export const ENTITY_DRAG_TYPE = 'application/x-cauldron-entity'
export const INSTANCE_DRAG_TYPE = 'application/x-cauldron-instance'
