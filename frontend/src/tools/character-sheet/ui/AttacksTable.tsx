import {
  IconButton,
  ScrollArea,
  TextInput,
  Tooltip,
} from '../../../shared/ui'
import type { ReactNode } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import {
  PlusIcon,
  RemoveIcon,
} from './icons'
import styles from './tables.module.css'

export type AttackTableEntry = {
  attackBonus: string
  damage: string
  damageType: string
  id: string
  name: string
  notes: string
}

export type AttackTableEntryPatch = Partial<
  Omit<AttackTableEntry, 'id'>
>

export type AttacksTableProps = {
  attacks: readonly AttackTableEntry[]
  defaultOpen?: boolean
  emptyText?: string
  fill?: boolean
  onAdd?: () => void
  onAttackChange?: (
    id: string,
    patch: AttackTableEntryPatch,
  ) => void
  onAttackRemove?: (id: string) => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  renderAttackBonus?: (
    attack: AttackTableEntry,
  ) => ReactNode
  title?: string
}

export function AttacksTable({
  attacks,
  defaultOpen = true,
  emptyText = 'Добавьте первую атаку или заклинание.',
  fill = false,
  onAdd,
  onAttackChange,
  onAttackRemove,
  onOpenChange,
  open,
  renderAttackBonus,
  title = 'Атаки и заклинания',
}: AttacksTableProps) {
  return (
    <CollapsibleSection
      collapsible={false}
      actions={
        onAdd ? (
          <Tooltip content="Добавить атаку">
            <IconButton
              aria-label="Добавить атаку"
              icon={<PlusIcon />}
              size="sm"
              variant="secondary"
              onClick={onAdd}
            />
          </Tooltip>
        ) : undefined
      }
      className={styles.tableRoot}
      data-fill={fill || undefined}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      {attacks.length > 0 ? (
        <ScrollArea
          aria-label={title}
          className={styles.tableViewport}
          contentClassName={styles.tableContent}
          orientation="both"
          rootClassName={styles.tableScroll}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.nameColumn} scope="col">
                  Название
                </th>
                <th className={styles.bonusColumn} scope="col">
                  Бонус атаки
                </th>
                <th className={styles.damageColumn} scope="col">
                  Урон / формула
                </th>
                <th className={styles.typeColumn} scope="col">
                  Тип урона
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
              {attacks.map((attack) => (
                <tr key={attack.id}>
                  <td>
                    <TextInput
                      aria-label={`Название атаки: ${attack.name || 'без названия'}`}
                      className={styles.compactControl}
                      placeholder="Название"
                      readOnly={!onAttackChange}
                      rootClassName={styles.compactFrame}
                      value={attack.name}
                      onChange={(event) => {
                        onAttackChange?.(attack.id, {
                          name: event.currentTarget.value,
                        })
                      }}
                    />
                  </td>
                  <td>
                    {renderAttackBonus ? (
                      renderAttackBonus(attack)
                    ) : (
                      <TextInput
                        aria-label={`Бонус атаки: ${attack.name || 'без названия'}`}
                        className={styles.compactControl}
                        inputMode="decimal"
                        placeholder="+0"
                        readOnly={!onAttackChange}
                        rootClassName={styles.compactFrame}
                        value={attack.attackBonus}
                        onChange={(event) => {
                          onAttackChange?.(attack.id, {
                            attackBonus: event.currentTarget.value,
                          })
                        }}
                      />
                    )}
                  </td>
                  <td>
                    <TextInput
                      aria-label={`Урон: ${attack.name || 'без названия'}`}
                      className={styles.compactControl}
                      placeholder="1d8 + STR_MOD"
                      readOnly={!onAttackChange}
                      rootClassName={styles.compactFrame}
                      value={attack.damage}
                      onChange={(event) => {
                        onAttackChange?.(attack.id, {
                          damage: event.currentTarget.value,
                        })
                      }}
                    />
                  </td>
                  <td>
                    <TextInput
                      aria-label={`Тип урона: ${attack.name || 'без названия'}`}
                      className={styles.compactControl}
                      placeholder="Рубящий"
                      readOnly={!onAttackChange}
                      rootClassName={styles.compactFrame}
                      value={attack.damageType}
                      onChange={(event) => {
                        onAttackChange?.(attack.id, {
                          damageType: event.currentTarget.value,
                        })
                      }}
                    />
                  </td>
                  <td>
                    <TextInput
                      aria-label={`Заметки: ${attack.name || 'атака без названия'}`}
                      className={styles.compactControl}
                      placeholder="Особые условия..."
                      readOnly={!onAttackChange}
                      rootClassName={styles.compactFrame}
                      value={attack.notes}
                      onChange={(event) => {
                        onAttackChange?.(attack.id, {
                          notes: event.currentTarget.value,
                        })
                      }}
                    />
                  </td>
                  <td>
                    {onAttackRemove && (
                      <Tooltip content="Удалить атаку">
                        <IconButton
                          aria-label={`Удалить атаку: ${attack.name || 'без названия'}`}
                          icon={<RemoveIcon />}
                          size="sm"
                          variant="secondary"
                          onClick={() => onAttackRemove(attack.id)}
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
