import { useState, type FocusEvent } from 'react'

import { NumericValue } from './NumericValue'

export type NumericEditorProps = {
  'aria-label': string
  compactPositiveSign?: boolean
  disabled?: boolean
  max?: number
  min?: number
  onValueChange: (value: number | null) => void
  presentation?: 'default' | 'list' | 'stat'
  value: number | null
}

function formatNumericValue(
  value: number | null,
  compactPositiveSign: boolean,
) {
  if (value === null) return ''
  if (
    compactPositiveSign &&
    value >= 0 &&
    value < 10
  ) {
    return `+${value}`
  }
  return String(value)
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
  compactPositiveSign = false,
  disabled = false,
  max,
  min,
  onValueChange,
  presentation = 'default',
  value,
}: NumericEditorProps) {
  const [draft, setDraft] = useState(
    formatNumericValue(value, compactPositiveSign),
  )
  const [previousDisplay, setPreviousDisplay] =
    useState({ compactPositiveSign, value })

  if (
    !Object.is(previousDisplay.value, value) ||
    previousDisplay.compactPositiveSign !==
      compactPositiveSign
  ) {
    setPreviousDisplay({ compactPositiveSign, value })
    setDraft(
      formatNumericValue(value, compactPositiveSign),
    )
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

    setDraft(
      formatNumericValue(clamped, compactPositiveSign),
    )
    onValueChange(clamped)
  }

  function handleBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    commit(event.currentTarget.value)
  }

  return (
    <NumericValue
      as="input"
      aria-label={ariaLabel}
      disabled={disabled}
      framed={presentation !== 'stat'}
      inputMode="decimal"
      placeholder="—"
      spellCheck={false}
      type="text"
      value={draft}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      onChange={(event) => {
        const nextDraft = event.currentTarget.value
        // Разрешаем промежуточный знак/дробь, но не текст, в том числе при вставке.
        if (!/^[+-]?\d*(?:[.,]\d*)?$/.test(nextDraft)) return
        setDraft(nextDraft)

        const parsed = parseNumericValue(nextDraft)
        if (parsed !== null) {
          onValueChange(parsed)
        }
      }}
    />
  )
}
