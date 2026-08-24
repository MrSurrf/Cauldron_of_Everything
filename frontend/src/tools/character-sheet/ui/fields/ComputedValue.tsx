import type { HTMLAttributes } from 'react'

import styles from './ComputedValue.module.css'

export type ComputedValueResult =
  | {
      status: 'ok'
      value: number
    }
  | {
      status: 'empty'
      value: null
    }
  | {
      status: 'error'
      value: null
      error: string
    }

export type NumericSignDisplay = 'standard' | 'compact'

export type ComputedValueProps = Omit<
  HTMLAttributes<HTMLOutputElement>,
  'children'
> & {
  prefixPositive?: boolean
  result: ComputedValueResult
  signDisplay?: NumericSignDisplay
}

function formatValue(
  result: ComputedValueResult,
  prefixPositive: boolean,
  signDisplay: NumericSignDisplay,
) {
  if (result.status !== 'ok') {
    return '—'
  }

  if (prefixPositive && signDisplay === 'compact') {
    return result.value >= 0 && result.value < 10
      ? `+${result.value}`
      : String(result.value)
  }

  if (prefixPositive && result.value > 0) {
    return `+${result.value}`
  }

  return String(result.value)
}

export function ComputedValue({
  className,
  prefixPositive = false,
  result,
  signDisplay = 'standard',
  ...outputProps
}: ComputedValueProps) {
  const rootClassName = [
    styles.value,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const error =
    result.status === 'error'
      ? result.error
      : undefined

  return (
    <output
      {...outputProps}
      className={rootClassName}
      data-status={result.status}
      title={error}
      aria-label={
        error
          ? `${outputProps['aria-label'] ? `${outputProps['aria-label']}. ` : ''}Ошибка вычисления: ${error}`
          : outputProps['aria-label']
      }
    >
      {formatValue(
        result,
        prefixPositive,
        signDisplay,
      )}
    </output>
  )
}
