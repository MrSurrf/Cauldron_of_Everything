import type { ReactNode } from 'react'

import {
  IconButton,
  TextArea,
  Tooltip,
} from '../../../shared/ui'
import { CollapsibleSection } from './CollapsibleSection'
import {
  PlusIcon,
  RemoveIcon,
} from './icons'
import styles from './sections.module.css'

export type RepeatableTextEntry = {
  id: string
  label?: string
  value: string
}

export type RepeatableTextSectionProps = {
  addLabel?: string
  defaultOpen?: boolean
  emptyText?: ReactNode
  entries: readonly RepeatableTextEntry[]
  onAdd?: () => void
  onEntryChange?: (
    id: string,
    value: string,
  ) => void
  onEntryRemove?: (id: string) => void
  onOpenChange?: (open: boolean) => void
  onRemove?: () => void
  onTitleChange?: (title: string) => void
  open?: boolean
  rows?: number
  title: string
}

export function RepeatableTextSection({
  addLabel = 'Добавить запись',
  defaultOpen = true,
  emptyText = 'Записей пока нет.',
  entries,
  onAdd,
  onEntryChange,
  onEntryRemove,
  onOpenChange,
  onRemove,
  onTitleChange,
  open,
  rows = 3,
  title,
}: RepeatableTextSectionProps) {
  const addAction = onAdd ? (
    <Tooltip content={addLabel}>
      <IconButton
        aria-label={addLabel}
        icon={<PlusIcon />}
        size="sm"
        variant="secondary"
        onClick={onAdd}
      />
    </Tooltip>
  ) : undefined

  return (
    <CollapsibleSection
      collapsible={false}
      actions={addAction}
      defaultOpen={defaultOpen}
      editableTitle={Boolean(onTitleChange)}
      onOpenChange={onOpenChange}
      onRemove={onRemove}
      onTitleChange={onTitleChange}
      open={open}
      title={title}
    >
      {entries.length > 0 ? (
        <div className={styles.repeatableList}>
          {entries.map((entry, index) => {
            const entryLabel =
              entry.label ?? `Запись ${index + 1}`

            return (
              <div
                key={entry.id}
                className={styles.repeatableItem}
              >
                <TextArea
                  aria-label={entryLabel}
                  className={styles.compactArea}
                  placeholder="Введите текст..."
                  readOnly={!onEntryChange}
                  rootClassName={styles.compactFrame}
                  rows={rows}
                  value={entry.value}
                  onChange={(event) => {
                    onEntryChange?.(
                      entry.id,
                      event.currentTarget.value,
                    )
                  }}
                />

                {onEntryRemove && (
                  <Tooltip content={`Удалить: ${entryLabel}`}>
                    <IconButton
                      aria-label={`Удалить: ${entryLabel}`}
                      icon={<RemoveIcon />}
                      size="sm"
                      variant="secondary"
                      onClick={() => onEntryRemove(entry.id)}
                    />
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className={styles.empty}>{emptyText}</p>
      )}
    </CollapsibleSection>
  )
}
