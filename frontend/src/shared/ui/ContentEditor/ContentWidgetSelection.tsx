import type { ReactNode } from 'react'
import type { NodeKey } from 'lexical'
import { IconButton } from '../IconButton'
import { TrashIcon } from '../icons'
import {
  ContentWidgetDraggable,
  type ContentWidgetDragDescriptor,
} from './ContentWidgetDragDrop'
import { useContentWidgetSelection } from './useContentWidgetSelection'
import styles from './ContentWidgetSelection.module.css'

export function ContentWidgetSelection({ nodeKey, children, dragDescriptor, label, inline = false, removeButton = true }: {
  nodeKey: NodeKey; children: ReactNode; dragDescriptor?: ContentWidgetDragDescriptor; label: string; inline?: boolean; removeButton?: boolean
}) {
  const { selected, select, remove, locked } = useContentWidgetSelection(nodeKey)
  const removeControl = removeButton && !locked ? (
    <IconButton
      aria-label={`Удалить ${label}`}
      className={styles.remove}
      decoration="bare"
      size="sm"
      icon={<TrashIcon />}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => { event.stopPropagation(); remove() }}
    />
  ) : null

  return (
    <ContentWidgetDraggable
      descriptor={dragDescriptor}
      disabled={Boolean(locked)}
      inline={inline}
      overlay={removeControl}
      selected={selected}
      onMouseDown={(event) => {
        if ((event.target as Element).closest('button, input, textarea, a, summary')) return
        event.preventDefault()
        select()
      }}
    >
      {children}
    </ContentWidgetDraggable>
  )
}
