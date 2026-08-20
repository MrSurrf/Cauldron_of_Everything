import { useState, type FocusEvent } from 'react'

import { TextInput } from '../../../../shared/ui'
import styles from './SheetFields.module.css'

export type NumericEditorProps = {
  'aria-label': string
  disabled?: boolean
  max?: number
  min?: number
  onValueChange: (value: number | null) => void
  presentation?: 'default' | 'stat'
  value: number | null
}

function formatNumericValue(value: number | null) {
  return value === null ? '' : String(value)
}

function parseNumericValue(value: string) {
  const normalized = value.trim().replace(',', '.')

  if (
    normalized === '' ||
    normalized === '-' ||
    normalized === '+' ||
    normalized === '.' ||
    normalized === '-.' ||
    normalized === '+.'
  ) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function NumericEditor({
  'aria-label': ariaLabel,
  disabled = false,
  max,
  min,
  onValueChange,
  presentation = 'default',
  value,
}: NumericEditorProps) {
  const [draft, setDraft] = useState(
    formatNumericValue(value),
  )
  const [previousValue, setPreviousValue] =
    useState(value)

  if (!Object.is(previousValue, value)) {
    setPreviousValue(value)
    setDraft(formatNumericValue(value))
  }

  function commit(nextDraft: string) {
    const parsed = parseNumericValue(nextDraft)
    const clamped =
      parsed === null
        ? null
        : Math.min(
            max ?? Number.POSITIVE_INFINITY,
            Math.max(
              min ?? Number.NEGATIVE_INFINITY,
              parsed,
            ),
          )

    setDraft(formatNumericValue(clamped))
    onValueChange(clamped)
  }

  function handleBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    commit(event.currentTarget.value)
  }

  return (
    <TextInput
      aria-label={ariaLabel}
      className={[
        styles.numericInput,
        presentation === 'stat' && styles.statInput,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      fieldClassName={[
        styles.compactField,
        presentation === 'stat' && styles.statField,
      ]
        .filter(Boolean)
        .join(' ')}
      inputMode="decimal"
      placeholder="—"
      rootClassName={[
        styles.compactFrame,
        presentation === 'stat' && styles.statFrame,
      ]
        .filter(Boolean)
        .join(' ')}
      spellCheck={false}
      type="text"
      value={draft}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextDraft = event.currentTarget.value
        setDraft(nextDraft)

        const parsed = parseNumericValue(nextDraft)
        if (parsed !== null) {
          onValueChange(parsed)
        }
      }}
    />
  )
}
