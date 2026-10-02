import type { ReactNode } from 'react'

import {
  Combobox,
  TextArea,
  TextInput,
} from '../../../shared/ui'
import { CollapsibleSection } from './CollapsibleSection'
import styles from './sections.module.css'

export type FeatureRecovery =
  | 'none'
  | 'short-rest'
  | 'long-rest'
  | 'either'
  | 'custom'

export type FeatureAccordionProps = {
  children?: ReactNode
  defaultOpen?: boolean
  description: string
  formula?: ReactNode
  maxUses?: number | null
  moveDownDisabled?: boolean
  moveUpDisabled?: boolean
  onDescriptionChange?: (description: string) => void
  onMaxUsesChange?: (value: number | null) => void
  onMoveDown?: () => void
  onMoveUp?: () => void
  onOpenChange?: (open: boolean) => void
  onRecoveryChange?: (recovery: FeatureRecovery) => void
  onRecoveryLabelChange?: (label: string) => void
  onRemove?: () => void
  onTitleChange?: (title: string) => void
  onUsedChange?: (value: number | null) => void
  open?: boolean
  recovery?: FeatureRecovery
  recoveryLabel?: string
  renderUsageField?: (
    field: 'current' | 'maximum',
    label: string,
  ) => ReactNode
  title: string
  used?: number | null
}

const recoveryOptions = [
  { value: 'none', label: 'Без восстановления' },
  { value: 'short-rest', label: 'Короткий отдых' },
  { value: 'long-rest', label: 'Продолжительный отдых' },
  { value: 'either', label: 'Короткий или продолжительный' },
  { value: 'custom', label: 'Другое условие' },
] as const

function parseOptionalNumber(value: string) {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export function FeatureAccordion({
  children,
  defaultOpen = false,
  description,
  formula,
  maxUses = null,
  moveDownDisabled = false,
  moveUpDisabled = false,
  onDescriptionChange,
  onMaxUsesChange,
  onMoveDown,
  onMoveUp,
  onOpenChange,
  onRecoveryChange,
  onRecoveryLabelChange,
  onRemove,
  onTitleChange,
  onUsedChange,
  open,
  recovery = 'none',
  recoveryLabel,
  renderUsageField,
  title,
  used = null,
}: FeatureAccordionProps) {
  const usageText =
    used === null && maxUses === null
      ? null
      : `${used ?? '—'} / ${maxUses ?? '—'}`

  return (
    <CollapsibleSection
      actions={
        usageText ? (
          <span className={styles.usage}>
            Использования {usageText}
          </span>
        ) : undefined
      }
      defaultOpen={defaultOpen}
      editableTitle={Boolean(onTitleChange)}
      moveDownDisabled={moveDownDisabled}
      moveUpDisabled={moveUpDisabled}
      onMoveDown={onMoveDown}
      onMoveUp={onMoveUp}
      onOpenChange={onOpenChange}
      onRemove={onRemove}
      onTitleChange={onTitleChange}
      open={open}
      title={title}
    >
      <div className={styles.featureContent}>
        <div className={styles.featureMeta}>
          {renderUsageField ? (
            renderUsageField('current', 'Использовано')
          ) : (
            <label className={styles.metaLabel}>
              Использовано
              <TextInput
                aria-label={`Использовано: ${title}`}
                className={styles.compactControl}
                inputMode="numeric"
                placeholder="0"
                readOnly={!onUsedChange}
                rootClassName={styles.compactFrame}
                value={used ?? ''}
                onChange={(event) => {
                  onUsedChange?.(
                    parseOptionalNumber(event.currentTarget.value),
                  )
                }}
              />
            </label>
          )}

          {renderUsageField ? (
            renderUsageField('maximum', 'Максимум')
          ) : (
            <label className={styles.metaLabel}>
              Максимум
              <TextInput
                aria-label={`Максимум использований: ${title}`}
                className={styles.compactControl}
                inputMode="numeric"
                placeholder="—"
                readOnly={!onMaxUsesChange}
                rootClassName={styles.compactFrame}
                value={maxUses ?? ''}
                onChange={(event) => {
                  onMaxUsesChange?.(
                    parseOptionalNumber(event.currentTarget.value),
                  )
                }}
              />
            </label>
          )}

          <div className={styles.metaLabel}>
            Восстановление
            <Combobox
              aria-label={`Условие восстановления: ${title}`}
              className={styles.compactControl}
              options={recoveryOptions}
              readOnly={!onRecoveryChange}
              rootClassName={styles.compactFrame}
              value={recovery}
              onValueChange={(value) => {
                if (value) {
                  onRecoveryChange?.(
                    value as FeatureRecovery,
                  )
                }
              }}
            />
          </div>
        </div>

        {recovery === 'custom' && (
          <TextInput
            aria-label={`Пользовательское условие восстановления: ${title}`}
            className={styles.compactControl}
            placeholder="Например, после сцены"
            readOnly={!onRecoveryLabelChange}
            rootClassName={styles.compactFrame}
            value={recoveryLabel ?? ''}
            onChange={(event) => {
              onRecoveryLabelChange?.(
                event.currentTarget.value,
              )
            }}
          />
        )}

        <TextArea
          aria-label={`Описание способности «${title}»`}
          className={styles.compactArea}
          placeholder="Описание способности..."
          readOnly={!onDescriptionChange}
          rootClassName={styles.compactFrame}
          rows={4}
          value={description}
          onChange={(event) => {
            onDescriptionChange?.(event.currentTarget.value)
          }}
        />

        {formula}

        {children && (
          <div className={styles.featureFields}>
            {children}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
