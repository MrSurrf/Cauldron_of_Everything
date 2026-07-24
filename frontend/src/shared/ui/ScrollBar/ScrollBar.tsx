import {
  forwardRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react'

import type { ScrollBarProps } from './ScrollBar.types'
import styles from './ScrollBar.module.css'

type ScrollBarStyle = CSSProperties & {
  '--scrollbar-position': string
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  if (!Number.isFinite(value)) {
    return minimum
  }

  return Math.min(Math.max(value, minimum), maximum)
}

export const ScrollBar = forwardRef<
  HTMLInputElement,
  ScrollBarProps
>(function ScrollBar(
  {
    'aria-label': ariaLabel,
    className,
    decrementLabel,
    defaultValue,
    disabled = false,
    incrementLabel,
    max = 100,
    min = 0,
    onValueChange,
    orientation = 'horizontal',
    step = 1,
    style,
    value,
    ...inputProps
  },
  ref,
) {
  const minimum = Math.min(min, max)
  const maximum = Math.max(min, max)
  const normalizedStep =
    Number.isFinite(step) && step > 0 ? step : 1
  const [internalValue, setInternalValue] = useState(
    () => clamp(defaultValue ?? minimum, minimum, maximum),
  )
  const controlled = value !== undefined
  const currentValue = clamp(
    controlled ? value : internalValue,
    minimum,
    maximum,
  )
  const position =
    maximum === minimum
      ? 0
      : ((currentValue - minimum) /
          (maximum - minimum)) *
        100

  const rootClassName = [
    styles.scrollBar,
    styles[orientation],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const rootStyle = {
    ...style,
    '--scrollbar-position': `${position}%`,
  } as ScrollBarStyle
  const rangeLabel =
    ariaLabel ??
    (orientation === 'vertical'
      ? 'Вертикальная прокрутка'
      : 'Горизонтальная прокрутка')
  const startLabel =
    decrementLabel ??
    (orientation === 'vertical'
      ? 'Прокрутить вверх'
      : 'Прокрутить влево')
  const endLabel =
    incrementLabel ??
    (orientation === 'vertical'
      ? 'Прокрутить вниз'
      : 'Прокрутить вправо')

  function commitValue(nextValue: number) {
    const next = clamp(nextValue, minimum, maximum)

    if (next === currentValue) {
      return
    }

    if (!controlled) {
      setInternalValue(next)
    }

    onValueChange?.(next)
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    commitValue(event.currentTarget.valueAsNumber)
  }

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      data-orientation={orientation}
      data-disabled={disabled || undefined}
    >
      <button
        className={styles.control}
        type={'button'}
        data-direction={'start'}
        aria-label={startLabel}
        disabled={disabled || currentValue <= minimum}
        onClick={() => {
          commitValue(currentValue - normalizedStep)
        }}
      >
        <span
          className={styles.arrow}
          aria-hidden={true}
        />
      </button>

      <span className={styles.rail}>
        <span
          className={styles.thumb}
          aria-hidden={true}
        />
        <input
          {...inputProps}
          ref={ref}
          className={styles.range}
          type={'range'}
          min={minimum}
          max={maximum}
          step={normalizedStep}
          value={currentValue}
          disabled={disabled}
          aria-label={rangeLabel}
          aria-orientation={orientation}
          onChange={handleChange}
        />
      </span>

      <button
        className={styles.control}
        type={'button'}
        data-direction={'end'}
        aria-label={endLabel}
        disabled={disabled || currentValue >= maximum}
        onClick={() => {
          commitValue(currentValue + normalizedStep)
        }}
      >
        <span
          className={styles.arrow}
          aria-hidden={true}
        />
      </button>
    </div>
  )
})
