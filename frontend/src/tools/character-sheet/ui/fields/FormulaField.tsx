import { useMemo } from 'react'

import {
  Button,
  IconButton,
  Popover,
  SegmentedControl,
  TextInput,
  Tooltip,
} from '../../../../shared/ui'
import { FormulaIcon, SettingsIcon } from '../icons'
import {
  ComputedValue,
  type ComputedValueResult,
  type NumericSignDisplay,
} from './ComputedValue'
import { NumericEditor } from './NumericEditor'
import sheetFieldStyles from './SheetFields.module.css'
import styles from './FormulaField.module.css'

export type FormulaFieldValue = {
  formulaOverride: string | null
  manualValue: number | null
  mode: 'manual' | 'formula'
}

export type FormulaVariableOption = {
  key: string
  label: string
}

export type FormulaFieldProps = {
  accessibleLabel?: string
  className?: string
  compact?: boolean
  defaultFormula?: string
  disabled?: boolean
  labelDetail?: string
  labelVisibility?: 'visible' | 'sr-only'
  label: string
  onValueChange: (value: FormulaFieldValue) => void
  presentation?: 'default' | 'list' | 'shield' | 'stat'
  prefixPositive?: boolean
  result: ComputedValueResult
  signDisplay?: NumericSignDisplay
  value: FormulaFieldValue
  variables?: readonly FormulaVariableOption[]
}

const modeOptions = [
  { value: 'manual', label: 'Вручную' },
  { value: 'formula', label: 'Формула' },
] as const

export function FormulaField({
  accessibleLabel,
  className,
  compact = false,
  defaultFormula,
  disabled = false,
  labelDetail,
  labelVisibility = 'visible',
  label,
  onValueChange,
  presentation = 'default',
  prefixPositive = false,
  result,
  signDisplay = 'standard',
  value,
  variables = [],
}: FormulaFieldProps) {
  const controlLabel = accessibleLabel ?? label
  const effectiveFormula =
    value.formulaOverride ?? defaultFormula ?? ''
  const variableSummary = useMemo(
    () => variables
      .map((variable) => variable.key)
      .join(', '),
    [variables],
  )
  const error =
    result.status === 'error'
      ? result.error
      : undefined

  const settings = (
    <div className={styles.settings}>
      <div className={styles.settingsHeader}>
        <FormulaIcon className={styles.settingsIcon} />
        <span>{label}</span>
      </div>

      <SegmentedControl
        aria-label={`Режим поля «${controlLabel}»`}
        disabled={disabled}
        options={modeOptions}
        value={value.mode}
        onValueChange={(mode) => {
          if (mode === 'manual' || mode === 'formula') {
            onValueChange({ ...value, mode })
          }
        }}
      />

      {value.mode === 'formula' && (
        <>
          <TextInput
            aria-label={`Формула: ${controlLabel}`}
            disabled={disabled}
            error={error}
            fieldClassName={sheetFieldStyles.compactField}
            hint={
              variableSummary
                ? `Доступно: ${variableSummary}`
                : undefined
            }
            placeholder="Например, 10 + DEX_MOD"
            rootClassName={sheetFieldStyles.compactFrame}
            spellCheck={false}
            value={effectiveFormula}
            onChange={(event) => {
              onValueChange({
                ...value,
                formulaOverride: event.currentTarget.value,
              })
            }}
          />

          <div className={styles.preview}>
            <span>Результат</span>
            <ComputedValue
              result={result}
              prefixPositive={prefixPositive}
            />
          </div>

          <Button
            disabled={
              disabled ||
              value.formulaOverride === null ||
              defaultFormula === undefined
            }
            icon={null}
            size="sm"
            variant="secondary"
            onClick={() => {
              onValueChange({
                ...value,
                formulaOverride: null,
              })
            }}
          >
            Вернуть стандартную
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div
      className={[styles.field, className]
        .filter(Boolean)
        .join(' ')}
      data-compact={compact || undefined}
      data-mode={value.mode}
      data-presentation={presentation}
      data-status={result.status}
    >
      <span
        className={styles.label}
        data-visibility={labelVisibility}
      >
        <span className={styles.labelText}>
          {label}
        </span>
        {labelDetail && (
          <small className={styles.labelDetail}>
            {labelDetail}
          </small>
        )}
      </span>

      <div className={styles.control}>
        {value.mode === 'manual' ? (
          <NumericEditor
            aria-label={controlLabel}
            compactPositiveSign={
              prefixPositive && signDisplay === 'compact'
            }
            disabled={disabled}
            presentation={
              presentation === 'stat' ||
              presentation === 'shield'
                ? 'stat'
                : 'default'
            }
            value={value.manualValue}
            onValueChange={(manualValue) => {
              onValueChange({
                ...value,
                manualValue,
              })
            }}
          />
        ) : (
          <ComputedValue
            aria-label={controlLabel}
            prefixPositive={prefixPositive}
            result={result}
            signDisplay={signDisplay}
          />
        )}

        <Popover
          content={settings}
          placement="bottom"
        >
          <Tooltip content={`Настроить поле «${controlLabel}»`}>
            <IconButton
              className={styles.settingsButton}
              aria-label={`Настроить поле «${controlLabel}»`}
              disabled={disabled}
              icon={<SettingsIcon />}
              size="sm"
              variant="secondary"
            />
          </Tooltip>
        </Popover>
      </div>

      {error && (
        <span className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}
