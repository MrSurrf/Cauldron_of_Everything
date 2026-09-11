import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { setRef } from '../internal/react'
import type {
  SegmentedControlOption,
  SegmentedControlProps,
} from './SegmentedControl.types'
import styles from './SegmentedControl.module.css'

function findEnabledIndex(
  options: readonly SegmentedControlOption[],
  startIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) {
    return -1
  }

  for (let step = 1; step <= options.length; step += 1) {
    const index =
      (startIndex + direction * step + options.length) %
      options.length

    if (!options[index].disabled) {
      return index
    }
  }

  return -1
}

function findEdgeEnabledIndex(
  options: readonly SegmentedControlOption[],
  edge: 'first' | 'last',
) {
  const start = edge === 'first' ? -1 : 0
  const direction = edge === 'first' ? 1 : -1

  return findEnabledIndex(options, start, direction)
}

export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(function SegmentedControl(
  {
    className,
    defaultValue = null,
    disabled = false,
    name,
    onValueChange,
    options,
    value,
    ...groupProps
  },
  ref,
) {
  const controlled = value !== undefined
  const [internalValue, setInternalValue] =
    useState<string | null>(defaultValue)
  const buttonRefs = useRef<
    Array<HTMLButtonElement | null>
  >([])
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedValue = controlled
    ? value
    : internalValue
  const selectedIndex = options.findIndex(
    (option) =>
      option.value === selectedValue &&
      !option.disabled,
  )
  const fallbackIndex = findEdgeEnabledIndex(
    options,
    'first',
  )
  const tabStopIndex =
    selectedIndex >= 0 ? selectedIndex : fallbackIndex
  const rootClassName = [styles.root, className]
    .filter(Boolean)
    .join(' ')

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      setRef(ref, node)
    },
    [ref],
  )

  useEffect(() => {
    if (controlled) return

    const form = rootRef.current?.closest('form')
    if (!form) return

    const handleReset = () => {
      setInternalValue(defaultValue)
    }

    form.addEventListener('reset', handleReset)
    return () => {
      form.removeEventListener('reset', handleReset)
    }
  }, [controlled, defaultValue])

  function selectOption(index: number) {
    const option = options[index]

    if (
      disabled ||
      !option ||
      option.disabled ||
      option.value === selectedValue
    ) {
      return
    }

    if (!controlled) {
      setInternalValue(option.value)
    }

    onValueChange?.(option.value)
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.defaultPrevented || disabled) {
      return
    }

    let nextIndex: number

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = findEnabledIndex(
          options,
          index,
          1,
        )
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = findEnabledIndex(
          options,
          index,
          -1,
        )
        break
      case 'End':
        nextIndex = findEdgeEnabledIndex(
          options,
          'last',
        )
        break
      case 'Home':
        nextIndex = findEdgeEnabledIndex(
          options,
          'first',
        )
        break
      default:
        return
    }

    if (nextIndex < 0) {
      return
    }

    event.preventDefault()
    selectOption(nextIndex)
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      {...groupProps}
      ref={setRootRef}
      role="radiogroup"
      className={rootClassName}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
    >
      {options.map((option, index) => {
        const selected =
          option.value === selectedValue
        const optionDisabled =
          disabled || option.disabled === true

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node
            }}
            type="button"
            role="radio"
            className={styles.option}
            disabled={optionDisabled}
            aria-checked={selected}
            aria-label={option.ariaLabel}
            data-selected={selected || undefined}
            tabIndex={
              !optionDisabled && index === tabStopIndex
                ? 0
                : -1
            }
            onClick={() => {
              selectOption(index)
            }}
            onKeyDown={(event) => {
              handleOptionKeyDown(event, index)
            }}
          >
            {option.label}
          </button>
        )
      })}

      {name && selectedValue !== null && (
        <input
          type="hidden"
          name={name}
          value={selectedValue}
          disabled={disabled}
        />
      )}
    </div>
  )
})
