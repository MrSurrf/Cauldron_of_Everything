import type { ReactNode } from 'react'
import type { NodeKey } from 'lexical'
import { IconButton } from '../IconButton'
import { useContentWidgetSelection } from './useContentWidgetSelection'
import styles from './ContentWidgetSelection.module.css'

export function ContentWidgetSelection({ nodeKey, children, label, inline = false, removeButton = true }: {
  nodeKey: NodeKey; children: ReactNode; label: string; inline?: boolean; removeButton?: boolean
}) {
  const { selected, select, remove, locked } = useContentWidgetSelection(nodeKey)
  return (
    <span
      className={styles.widget}
      data-content-widget
      data-selected={selected || undefined}
      data-inline={inline || undefined}
      contentEditable={false}
      onMouseDown={(event) => {
        if ((event.target as Element).closest('button, input, textarea, a, summary')) return
        event.preventDefault()
        select()
      }}
    >
      {children}
      {removeButton && !locked && (
        <IconButton
          aria-label={`Удалить ${label}`}
          className={styles.remove}
          decoration="bare"
          size="sm"
          icon={<span aria-hidden="true">×</span>}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => { event.stopPropagation(); remove() }}
        />
      )}
    </span>
  )
}
