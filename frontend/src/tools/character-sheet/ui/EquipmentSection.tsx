import {
  IconButton,
  ScrollArea,
  TextInput,
  Tooltip,
} from '../../../shared/ui'
import { CollapsibleSection } from './CollapsibleSection'
import {
  CheckIcon,
  PlusIcon,
  RemoveIcon,
} from './icons'
import styles from './tables.module.css'

export type EquipmentEntry = {
  attuned: boolean
  equipped: boolean
  id: string
  itemId?: string
  name: string
  notes: string
  quantity: number
}

export type EquipmentEntryPatch = Partial<
  Omit<EquipmentEntry, 'id' | 'itemId'>
>

export type EquipmentSectionProps = {
  defaultOpen?: boolean
  emptyText?: string
  entries: readonly EquipmentEntry[]
  onAdd?: () => void
  onEntryChange?: (
    id: string,
    patch: EquipmentEntryPatch,
  ) => void
  onEntryRemove?: (id: string) => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  title?: string
}

function parseQuantity(value: string) {
  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function EquipmentSection({
  defaultOpen = true,
  emptyText = 'Снаряжение пока не добавлено.',
  entries,
  onAdd,
  onEntryChange,
  onEntryRemove,
  onOpenChange,
  open,
  title = 'Снаряжение',
}: EquipmentSectionProps) {
  return (
    <CollapsibleSection
      collapsible={false}
      actions={
        onAdd ? (
          <Tooltip content="Добавить предмет">
            <IconButton
              aria-label="Добавить предмет"
              icon={<PlusIcon />}
              size="sm"
              variant="secondary"
              onClick={onAdd}
            />
          </Tooltip>
        ) : undefined
      }
      className={styles.tableRoot}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      {entries.length > 0 ? (
        <ScrollArea
          aria-label={title}
          className={styles.tableViewport}
          contentClassName={styles.tableContent}
          orientation="horizontal"
          rootClassName={styles.tableScroll}
        >
          <table className={`${styles.table} ${styles.equipmentTable}`}>
            <thead>
              <tr>
                <th className={styles.nameColumn} scope="col">
                  Предмет
                </th>
                <th className={styles.quantityColumn} scope="col">
                  Количество
                </th>
                <th className={styles.stateColumn} scope="col">
                  Экипирован
                </th>
                <th className={styles.stateColumn} scope="col">
                  Настроен
                </th>
                <th className={styles.notesColumn} scope="col">
                  Заметки
                </th>
                <th className={styles.actionsColumn} scope="col">
                  <span className={styles.linkedBadge}>Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <TextInput
                      aria-label={`Название предмета: ${entry.name || 'без названия'}`}
                      className={styles.compactControl}
                      placeholder="Название"
                      readOnly={!onEntryChange || Boolean(entry.itemId)}
                      rootClassName={styles.compactFrame}
                      value={entry.name}
                      onChange={(event) => {
                        onEntryChange?.(entry.id, {
                          name: event.currentTarget.value,
                        })
                      }}
                    />
                    {entry.itemId && (
                      <span className={styles.linkedBadge}>
                        Encyclopedia · {entry.itemId}
                      </span>
                    )}
                  </td>
                  <td>
                    <TextInput
                      aria-label={`Количество: ${entry.name || 'предмет'}`}
                      className={styles.compactControl}
                      inputMode="numeric"
                      placeholder="1"
                      readOnly={!onEntryChange}
                      rootClassName={styles.compactFrame}
                      value={entry.quantity}
                      onChange={(event) => {
                        onEntryChange?.(entry.id, {
                          quantity: parseQuantity(event.currentTarget.value),
                        })
                      }}
                    />
                  </td>
                  <td>
                    <Tooltip
                      content={entry.equipped ? 'Снять предмет' : 'Экипировать предмет'}
                    >
                      <IconButton
                        aria-label={`Экипировка: ${entry.name || 'предмет'}`}
                        aria-pressed={entry.equipped}
                        className={styles.stateButton}
                        disabled={!onEntryChange}
                        icon={<CheckIcon />}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onEntryChange?.(entry.id, {
                            equipped: !entry.equipped,
                          })
                        }}
                      />
                    </Tooltip>
                  </td>
                  <td>
                    <Tooltip
                      content={entry.attuned ? 'Снять настройку' : 'Настроиться на предмет'}
                    >
                      <IconButton
                        aria-label={`Настройка: ${entry.name || 'предмет'}`}
                        aria-pressed={entry.attuned}
                        className={styles.stateButton}
                        disabled={!onEntryChange}
                        icon={<CheckIcon />}
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onEntryChange?.(entry.id, {
                            attuned: !entry.attuned,
                          })
                        }}
                      />
                    </Tooltip>
                  </td>
                  <td>
                    <TextInput
                      aria-label={`Заметки: ${entry.name || 'предмет'}`}
                      className={styles.compactControl}
                      placeholder="Заметки"
                      readOnly={!onEntryChange}
                      rootClassName={styles.compactFrame}
                      value={entry.notes}
                      onChange={(event) => {
                        onEntryChange?.(entry.id, {
                          notes: event.currentTarget.value,
                        })
                      }}
                    />
                  </td>
                  <td>
                    {onEntryRemove && (
                      <Tooltip content="Удалить предмет">
                        <IconButton
                          aria-label={`Удалить предмет: ${entry.name || 'без названия'}`}
                          icon={<RemoveIcon />}
                          size="sm"
                          variant="secondary"
                          onClick={() => onEntryRemove(entry.id)}
                        />
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      ) : (
        <p className={styles.empty}>{emptyText}</p>
      )}
    </CollapsibleSection>
  )
}
