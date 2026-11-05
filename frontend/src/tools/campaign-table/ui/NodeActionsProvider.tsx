import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { NodeActionsContext } from './tableContext'
import type { NodeActions, TableActions } from './tableContext'
import { indexContainerMembers, stableDiagramMetadata } from './nodeMetadata'

/** Ноды подписаны на команды и метаданные, а не на координаты всей схемы. */
export function NodeActionsProvider({ value, children }: { value: TableActions; children: ReactNode }) {
  const latest = useRef(value)
  useLayoutEffect(() => { latest.current = value }, [value])
  const [commands] = useState(() => ({
    beginGesture: () => latest.current.beginGesture(),
    endGesture: () => latest.current.endGesture(),
    startConnection: (...args: Parameters<TableActions['startConnection']>) => latest.current.startConnection(...args),
    beginConnection: (...args: Parameters<TableActions['beginConnection']>) => latest.current.beginConnection(...args),
    beginInstanceDrag: (id: string) => latest.current.beginInstanceDrag(id),
    placeOnDiagram: (id: string, diagramId: string) => latest.current.placeOnDiagram(id, diagramId),
    open: (id: string) => latest.current.open(id),
    edit: (id: string) => latest.current.edit(id),
    remove: (id: string) => latest.current.remove(id),
    release: (id: string) => latest.current.release(id),
    toggleCreature: (id: string) => latest.current.toggleCreature(id),
  }))
  const [metadata, setMetadata] = useState(() => ({
    nodes: value.diagram.nodes,
    diagramSource: value.diagrams,
    membersByContainer: indexContainerMembers(value.diagram.nodes),
    diagrams: stableDiagramMetadata(value.diagrams),
  }))
  if (metadata.nodes !== value.diagram.nodes || metadata.diagramSource !== value.diagrams) {
    // Корректировка до рендера детей: подписчики получают только итоговый снимок.
    setMetadata({
      nodes: value.diagram.nodes,
      diagramSource: value.diagrams,
      membersByContainer: metadata.nodes === value.diagram.nodes ? metadata.membersByContainer
        : indexContainerMembers(value.diagram.nodes, metadata.membersByContainer),
      diagrams: metadata.diagramSource === value.diagrams ? metadata.diagrams
        : stableDiagramMetadata(value.diagrams, metadata.diagrams),
    })
  }
  const draftId = value.draft?.id
  const draftType = value.draft?.type
  const draft = useMemo(() => draftId && draftType ? {
    id: draftId,
    type: draftType,
    commit: (name: string) => { if (latest.current.draft?.id === draftId) latest.current.draft.commit(name) },
    cancel: () => { if (latest.current.draft?.id === draftId) latest.current.draft.cancel() },
  } : undefined, [draftId, draftType])
  const { readOnly, connectionSource, dropTarget, diagram: { id: diagramId } } = value
  const { membersByContainer, diagrams } = metadata
  const actions: NodeActions = useMemo(() => ({
    ...commands, readOnly, connectionSource, dropTarget, diagramId, membersByContainer, diagrams, draft,
  }), [commands, readOnly, connectionSource, dropTarget, diagramId, membersByContainer, diagrams, draft])
  return <NodeActionsContext.Provider value={actions}>{children}</NodeActionsContext.Provider>
}
