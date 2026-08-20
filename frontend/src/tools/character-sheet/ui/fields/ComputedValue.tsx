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

export type ComputedValueProps = Omit<
  HTMLAttributes<HTMLOutputElement>,
  'children'
> & {
  prefixPositive?: boolean
  result: ComputedValueResult
}

function formatValue(
  result: ComputedValueResult,
  prefixPositive: boolean,
) {
  if (result.status !== 'ok') {
    return '—'
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
      {formatValue(result, prefixPositive)}
    </output>
  )
}
