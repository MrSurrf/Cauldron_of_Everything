import type { HTMLAttributes } from 'react'

import { NumericValue } from './NumericValue'

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
  framed?: boolean
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
  framed = false,
  prefixPositive = false,
  result,
  signDisplay = 'standard',
  ...outputProps
}: ComputedValueProps) {
  const error =
    result.status === 'error'
      ? result.error
      : undefined

  return (
    <NumericValue
      {...outputProps}
      as="output"
      className={className}
      framed={framed}
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
    </NumericValue>
  )
}
