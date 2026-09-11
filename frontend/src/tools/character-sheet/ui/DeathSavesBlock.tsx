import {
  Tooltip,
} from '../../../shared/ui'
import { CollapsibleSection } from './CollapsibleSection'
import styles from './stats.module.css'

export type DeathSavesBlockProps = {
  defaultOpen?: boolean
  failures: number
  onChange?: (value: {
    failures: number
    successes: number
  }) => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  successes: number
  title?: string
}

function clampMarks(value: number) {
  return Math.max(0, Math.min(3, value))
}

export function DeathSavesBlock({
  defaultOpen = true,
  failures,
  onChange,
  onOpenChange,
  open,
  successes,
  title = 'Спасброски от смерти',
}: DeathSavesBlockProps) {
  const safeSuccesses = clampMarks(successes)
  const safeFailures = clampMarks(failures)

  function renderMarks(
    kind: 'success' | 'failure',
    count: number,
  ) {
    const isSuccess = kind === 'success'
    const label = isSuccess ? 'Успех' : 'Провал'

    return (
      <div className={styles.saveControls}>
        {[1, 2, 3].map((mark) => {
          const active = mark <= count

          return (
            <Tooltip
              key={mark}
              content={`${label} ${mark}`}
            >
              <button
                type="button"
                aria-label={`${label} ${mark}`}
                aria-pressed={active}
                className={
                  isSuccess
                    ? `${styles.saveMark}`
                    : `${styles.failureMark}`
                }
                disabled={!onChange}
                onClick={() => {
                  const nextCount = active && mark === count
                    ? mark - 1
                    : mark

                  onChange?.({
                    failures: isSuccess
                      ? safeFailures
                      : nextCount,
                    successes: isSuccess
                      ? nextCount
                      : safeSuccesses,
                  })
                }}
              />
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <CollapsibleSection
      collapsible={false}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <div className={styles.deathSaves}>
        <div className={styles.saveRow}>
          <span className={styles.saveLabel}>Успехи</span>
          {renderMarks('success', safeSuccesses)}
        </div>
        <div className={styles.saveRow}>
          <span className={styles.saveLabel}>Провалы</span>
          {renderMarks('failure', safeFailures)}
        </div>
      </div>
    </CollapsibleSection>
  )
}
