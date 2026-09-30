import { createContext, useContext } from 'react'
import type { Diagram } from '../model/table'

export type TableActions = {
  diagram: Diagram
  readOnly: boolean
  open: (id: string) => void
  edit: (id: string) => void
  remove: (id: string) => void
  release: (id: string) => void
  duplicate: (id: string) => void
}
export const TableContext = createContext<TableActions | null>(null)
export function useTableActions() {
  const actions = useContext(TableContext)
  if (!actions) throw new Error('Узел должен находиться внутри пространства кампании')
  return actions
}
export const ENTITY_DRAG_TYPE = 'application/x-cauldron-entity'
export const INSTANCE_DRAG_TYPE = 'application/x-cauldron-instance'
