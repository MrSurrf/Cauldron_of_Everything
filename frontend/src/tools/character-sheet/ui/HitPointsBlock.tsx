import { TextInput } from '../../../shared/ui'
import type { ReactNode } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import styles from './stats.module.css'

export type HitPointsValue = number | null

export type HitPointsPatch = {
  current?: HitPointsValue
  maximum?: HitPointsValue
  temporary?: HitPointsValue
}

export type HitPointsBlockProps = {
  current: HitPointsValue
  defaultOpen?: boolean
  maximum: HitPointsValue
  onChange?: (patch: HitPointsPatch) => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  renderField?: (
    field: 'current' | 'maximum' | 'temporary',
    label: string,
    value: HitPointsValue,
  ) => ReactNode
  temporary: HitPointsValue
  title?: string
}

function parseHitPoints(value: string) {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export function HitPointsBlock({
  current,
  defaultOpen = true,
  maximum,
  onChange,
  onOpenChange,
  open,
  renderField,
  temporary,
  title = 'Хиты',
}: HitPointsBlockProps) {
  const fields = [
    {
      key: 'maximum',
      label: 'Максимальные',
      value: maximum,
    },
    {
      key: 'current',
      label: 'Текущие',
      value: current,
    },
    {
      key: 'temporary',
      label: 'Временные',
      value: temporary,
    },
  ] as const

  return (
    <CollapsibleSection
      collapsible={false}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <div className={styles.hpGrid}>
        {fields.map((field) => (
          renderField ? (
            <div
              key={field.key}
              className={styles.fieldLabel}
            >
              {renderField(field.key, field.label, field.value)}
            </div>
          ) : (
            <label key={field.key} className={styles.fieldLabel}>
              {field.label}
              <TextInput
                aria-label={`${field.label} хиты`}
                className={`${styles.compactControl} ${styles.statInput}`}
                inputMode="numeric"
                placeholder="0"
                readOnly={!onChange}
                rootClassName={styles.compactFrame}
                value={field.value ?? ''}
                onChange={(event) => {
                  onChange?.({
                    [field.key]: parseHitPoints(
                      event.currentTarget.value,
                    ),
                  })
                }}
              />
            </label>
          )
        ))}
      </div>
    </CollapsibleSection>
  )
}
