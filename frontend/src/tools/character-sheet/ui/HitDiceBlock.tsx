import {
  IconButton,
  TextInput,
  Tooltip,
} from '../../../shared/ui'
import type { ReactNode } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import {
  PlusIcon,
  RemoveIcon,
} from './icons'
import styles from './stats.module.css'

export type HitDicePool = {
  die: string
  id: string
  remaining: number | null
  total: number | null
}

export type HitDicePoolPatch = Partial<
  Omit<HitDicePool, 'id'>
>

export type HitDiceBlockProps = {
  defaultOpen?: boolean
  onAdd?: () => void
  onOpenChange?: (open: boolean) => void
  onPoolChange?: (
    id: string,
    patch: HitDicePoolPatch,
  ) => void
  onPoolRemove?: (id: string) => void
  open?: boolean
  pools: readonly HitDicePool[]
  renderPoolField?: (
    pool: HitDicePool,
    field: 'remaining' | 'total',
    label: string,
  ) => ReactNode
  title?: string
}

function parseOptionalNumber(value: string) {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : null
}

export function HitDiceBlock({
  defaultOpen = true,
  onAdd,
  onOpenChange,
  onPoolChange,
  onPoolRemove,
  open,
  pools,
  renderPoolField,
  title = 'Кости хитов',
}: HitDiceBlockProps) {
  return (
    <CollapsibleSection
      collapsible={false}
      actions={
        onAdd ? (
          <Tooltip content="Добавить пул костей">
            <IconButton
              aria-label="Добавить пул костей хитов"
              icon={<PlusIcon />}
              size="sm"
              variant="secondary"
              onClick={onAdd}
            />
          </Tooltip>
        ) : undefined
      }
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      {pools.length > 0 ? (
        <div className={styles.diceList}>
          {pools.map((pool, poolIndex) => (
            <div key={pool.id} className={styles.diceRow}>
              <label className={styles.fieldLabel}>
                Кость
                <TextInput
                  aria-label={`Тип кости хитов: пул ${poolIndex + 1}`}
                  className={styles.compactControl}
                  placeholder="d10"
                  readOnly={!onPoolChange}
                  rootClassName={styles.compactFrame}
                  value={pool.die}
                  onChange={(event) => {
                    onPoolChange?.(pool.id, {
                      die: event.currentTarget.value,
                    })
                  }}
                />
              </label>

              {renderPoolField ? (
                renderPoolField(pool, 'remaining', 'Осталось')
              ) : (
                <label className={styles.fieldLabel}>
                  Осталось
                  <TextInput
                    aria-label={`Оставшиеся кости ${pool.die}: пул ${poolIndex + 1}`}
                    className={styles.compactControl}
                    inputMode="numeric"
                    placeholder="0"
                    readOnly={!onPoolChange}
                    rootClassName={styles.compactFrame}
                    value={pool.remaining ?? ''}
                    onChange={(event) => {
                      onPoolChange?.(pool.id, {
                        remaining: parseOptionalNumber(
                          event.currentTarget.value,
                        ),
                      })
                    }}
                  />
                </label>
              )}

              {renderPoolField ? (
                renderPoolField(pool, 'total', 'Всего')
              ) : (
                <label className={styles.fieldLabel}>
                  Всего
                  <TextInput
                    aria-label={`Всего костей ${pool.die}: пул ${poolIndex + 1}`}
                    className={styles.compactControl}
                    inputMode="numeric"
                    placeholder="0"
                    readOnly={!onPoolChange}
                    rootClassName={styles.compactFrame}
                    value={pool.total ?? ''}
                    onChange={(event) => {
                      onPoolChange?.(pool.id, {
                        total: parseOptionalNumber(
                          event.currentTarget.value,
                        ),
                      })
                    }}
                  />
                </label>
              )}

              {onPoolRemove && (
                <Tooltip content="Удалить пул костей">
                  <IconButton
                    aria-label={`Удалить пул костей ${pool.die}: пул ${poolIndex + 1}`}
                    icon={<RemoveIcon />}
                    size="sm"
                    variant="secondary"
                    onClick={() => onPoolRemove(pool.id)}
                  />
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Пулы костей не добавлены.</p>
      )}
    </CollapsibleSection>
  )
}
